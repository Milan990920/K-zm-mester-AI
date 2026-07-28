// SPEC.md 3.1 — egységár "megadható, vagy számolható: bruttó / mennyiség".
// Kis, önmagában tesztelhető logika, mert pénzügyi számítás — itt nincs
// helye "majdnem jó" kerekítésnek.

export function computeVatAndGross(netAmount: number, vatRate: number): { vatAmount: number; grossAmount: number } {
  const vatAmount = round2((netAmount * vatRate) / 100);
  const grossAmount = round2(netAmount + vatAmount);
  return { vatAmount, grossAmount };
}

export function computeUnitPrice(grossAmount: number, quantity: number): number | null {
  if (quantity <= 0) return null;
  return round2(grossAmount / quantity);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
