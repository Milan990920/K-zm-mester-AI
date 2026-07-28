import { describe, expect, it } from "vitest";
import { formatAmount, formatPeriod, formatQuantity } from "@/lib/format";

describe("formatPeriod (SPEC.md 5.3.7 — mindig együtt, sose külön dátum)", () => {
  it("ÉÉÉÉ.HH.NN. – ÉÉÉÉ.HH.NN. formátumban adja vissza", () => {
    expect(formatPeriod(new Date(2026, 0, 1), new Date(2026, 0, 31))).toBe("2026.01.01. – 2026.01.31.");
  });
});

describe("formatQuantity (SPEC.md 5.3.8 — szám és mértékegység sose külön)", () => {
  it("egy stringben adja vissza a mennyiséget és a mértékegységet, ezres tagolással", () => {
    expect(formatQuantity(12450, "kWh")).toBe("12 450 kWh");
  });
});

describe("formatAmount", () => {
  it("HUF-ot Ft jellel, ezres tagolással formáz", () => {
    expect(formatAmount(1234567, "HUF")).toBe("1 234 567 Ft");
  });

  it("kerekít egész forintra", () => {
    expect(formatAmount(1234.6, "HUF")).toBe("1 235 Ft");
  });
});
