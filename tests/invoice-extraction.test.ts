import { describe, expect, it } from "vitest";
import { extractInvoiceData } from "@/lib/invoiceExtraction";

describe("extractInvoiceData", () => {
  it("recognizes provider/customer tax numbers, dates, POD and amounts from a labelled layout", () => {
    const text = `
Villamos energia elszámoló számla
Szolgáltató neve:
Teszt Áramhálózati Zártkörűen Működő Részvénytársaság
Címe: HU-9999 Teszt,
Adószáma: 10741980-2-08
SZOVA Nonprofit Zrt.
Elszámolási időszak:2026.04.01 - 2026.04.30
Fizetendő összeg:38 040 Ft
Fizetési határidő:2026.05.19
Felhasználási hely címe: Teszt üzem
9700 Teszt utca 1.
Vevő neve:SZOVA Nonprofit Zrt.
Vevő adószáma:13980335-2-18
Számla sorszáma: 111797049827
Számla kelte: 2026.05.05
Mérési pont azonosító: HU000110C51-U-TESZT-1
Fogyasztás összesen:    199 kWh
Nettó számlaérték összesen29 953
Bruttó számlaérték összesen**38 040
`;

    const result = extractInvoiceData(text);

    expect(result.providerTaxNumber).toBe("10741980-2-08");
    expect(result.customerTaxNumber).toBe("13980335-2-18");
    expect(result.providerName).toContain("Teszt Áramhálózati");
    expect(result.invoiceNumber).toBe("111797049827");
    expect(result.issueDate).toBe("2026-05-05");
    expect(result.periodStart).toBe("2026-04-01");
    expect(result.periodEnd).toBe("2026-04-30");
    expect(result.dueDate).toBe("2026-05-19");
    expect(result.podCode).toBe("HU000110C51-U-TESZT-1");
    expect(result.quantity).toBe(199);
    expect(result.unit).toBe("kWh");
    expect(result.netAmount).toBe(29953);
    expect(result.grossAmount).toBe(38040);
    expect(result.vatRate).toBe(27);
    expect(result.warnings).toHaveLength(0);
  });

  it("tolerates a non-breaking space inside a label and glued (unspaced) amounts", () => {
    // A "Számlázott időszak" közötti szóköz szándékosan nem törhető szóköz
    // ( ) — valós PDF-kinyerésnél is előfordul, és a `\s` mintaosztálynak
    // ezt is el kell fogadnia.
    const text =
      "Eladó:\nTeszt Gáz Kereskedelmi Kft.\nAdószám: 14607569-2-05\nVevő:\nAdószám:13980335-2-18\n" +
      "Számla száma: E20260012466\nSzámlázott időszak:2026.06.01-2026.06.30\n" +
      "Fizetendő:38 429 Ft\nBruttó számlaérték összesen*1510";

    const result = extractInvoiceData(text);

    expect(result.periodStart).toBe("2026-06-01");
    expect(result.periodEnd).toBe("2026-06-30");
    // Az elválasztó nélküli "1510" a teljes négy jegyet adja vissza, nem
    // csak az első hármat (ez volt a NUMBER minta eredeti hibája).
    expect(result.grossAmount).toBe(1510);
  });

  it("extracts a 16-character gas POD (39N prefix) even when glued to the next field", () => {
    const text = "POD:39N050146626000YFizetési határidő:2026.06.01";
    const result = extractInvoiceData(text);
    expect(result.podCode).toBe("39N050146626000Y");
  });

  it("leaves quantity/unit null for a capacity-fee-only invoice rather than guessing", () => {
    const text =
      "Adószám: 14607569-2-05\nAdószám:13980335-2-18\n" +
      "Rendszerhasználati teljesítménydíj1,0hó40 23540 23527%10 86351 098";
    const result = extractInvoiceData(text);
    expect(result.quantity).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.warnings.some((w) => w.includes("fogyasztott mennyiséget"))).toBe(true);
  });

  it("finds the provider name near its own tax number when there is no explicit label", () => {
    const text =
      "Villamos energia számla\nSZOVA Nonprofit Zrt.\nBoglárka utca 2\n" +
      "Teszt Next Energiakereskedelmi Zrt.\n1081 Budapest\nAdószám: 26713111-2-44\n" +
      "Szerződő/Fizető: SZOVA Nonprofit Zrt.\nAdószám: 13980335-2-18";
    const result = extractInvoiceData(text);
    expect(result.providerName).toBe("Teszt Next Energiakereskedelmi Zrt.");
  });

  it("returns null fields with warnings for text that has no recognizable invoice markers", () => {
    const result = extractInvoiceData("Ez egy teljesen ismeretlen szövegű dokumentum.");
    expect(result.customerTaxNumber).toBeNull();
    expect(result.grossAmount).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
