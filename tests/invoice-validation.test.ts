import { describe, expect, it } from "vitest";
import { buildInvoiceSchema } from "@/lib/validations/invoice";

const ELECTRICITY_UNIT_IDS = ["unit-kwh", "unit-mwh"];

const validFinal = {
  customerId: "c1",
  consumptionSiteId: "s1",
  measurementPointId: "m1",
  energyTypeId: "e1",
  providerName: "MVM Next",
  invoiceNumber: "2026/001",
  issueDate: "2026-02-01",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  quantity: 1250,
  unitId: "unit-kwh",
  netAmount: 40000,
  vatRate: 27,
  vatAmount: 10800,
  grossAmount: 50800,
  invoiceType: "SETTLEMENT",
};

describe("buildInvoiceSchema — mértékegység szabály", () => {
  it("elfogadja az energianemhez tartozó mértékegységet", () => {
    const result = buildInvoiceSchema(ELECTRICITY_UNIT_IDS).safeParse(validFinal);
    expect(result.success).toBe(true);
  });

  it("elutasítja az energianemhez nem tartozó mértékegységet (pl. m³-egység villamos energiánál)", () => {
    const result = buildInvoiceSchema(ELECTRICITY_UNIT_IDS).safeParse({ ...validFinal, unitId: "unit-m3" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "unitId")).toBe(true);
    }
  });
});

describe("buildInvoiceSchema — időszak sorrend", () => {
  it("elutasítja, ha a kezdő dátum nem korábbi a záró dátumnál", () => {
    const result = buildInvoiceSchema(null).safeParse({
      ...validFinal,
      periodStart: "2026-02-01",
      periodEnd: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "periodEnd")).toBe(true);
    }
  });

  it("egyenlő kezdő és záró dátumot is elutasít", () => {
    const result = buildInvoiceSchema(null).safeParse({
      ...validFinal,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("buildInvoiceSchema — kötelező mezők, kivéve piszkozatnál", () => {
  it("piszkozatként elfogadja a hiányos számlát", () => {
    const result = buildInvoiceSchema(null).safeParse({ isDraft: true, providerName: "MVM Next" });
    expect(result.success).toBe(true);
  });

  it("végleges számlánál megköveteli a kötelező mezőket", () => {
    const result = buildInvoiceSchema(null).safeParse({ isDraft: false, providerName: "MVM Next" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("customerId");
      expect(paths).toContain("grossAmount");
    }
  });
});
