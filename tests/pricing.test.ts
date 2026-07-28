import { describe, expect, it } from "vitest";
import { computeUnitPrice, computeVatAndGross } from "@/lib/calculations/pricing";

describe("computeVatAndGross", () => {
  it("27%-os áfát helyesen számol", () => {
    expect(computeVatAndGross(40000, 27)).toEqual({ vatAmount: 10800, grossAmount: 50800 });
  });

  it("kerekít 2 tizedesjegyre", () => {
    expect(computeVatAndGross(1000, 5)).toEqual({ vatAmount: 50, grossAmount: 1050 });
  });
});

describe("computeUnitPrice", () => {
  it("bruttó/mennyiség hányadost ad", () => {
    expect(computeUnitPrice(50800, 1250)).toBe(40.64);
  });

  it("null-t ad vissza nulla vagy negatív mennyiségnél (nem oszt nullával)", () => {
    expect(computeUnitPrice(1000, 0)).toBeNull();
    expect(computeUnitPrice(1000, -5)).toBeNull();
  });
});
