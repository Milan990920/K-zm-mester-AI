import { describe, expect, it } from "vitest";
import { findDuplicateWarnings } from "@/lib/validations/duplicate";

describe("findDuplicateWarnings (SPEC.md 4.4 — figyelmeztetés, nem tiltás)", () => {
  it("nem ad figyelmeztetést, ha nincs ütközés", () => {
    const warnings = findDuplicateWarnings(
      { invoiceNumber: "2026/002", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
      [{ id: "1", invoiceNumber: "2026/001", periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") }],
    );
    expect(warnings).toHaveLength(0);
  });

  it("figyelmeztet azonos számlaszámra", () => {
    const warnings = findDuplicateWarnings(
      { invoiceNumber: "2026/001", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
      [{ id: "1", invoiceNumber: "2026/001", periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") }],
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/számlaszámmal/);
  });

  it("figyelmeztet átfedő számlázási időszakra", () => {
    const warnings = findDuplicateWarnings(
      { invoiceNumber: "2026/002", periodStart: new Date("2026-01-15"), periodEnd: new Date("2026-02-15") },
      [{ id: "1", invoiceNumber: "2026/001", periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") }],
    );
    expect(warnings.some((w) => w.match(/átfedésben/))).toBe(true);
  });
});
