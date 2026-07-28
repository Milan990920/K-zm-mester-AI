// SPEC.md 5.3 — ezek a szabályok KÖTELEZŐEK, nem stílusjavaslatok: az
// időszak mindig együtt jelenik meg, a mennyiség és a mértékegység soha nem
// kerülhet külön cellába/komponensbe. Mindkét formázó egy helyen él, hogy a
// számlalista és a dashboard soha ne térhessen el egymástól.
//
// Szándékosan NEM `Number.prototype.toLocaleString("hu-HU")`-t használunk:
// Node build-ek gyakran csak részleges ICU-adattal érkeznek, ahol a "hu-HU"
// ezres tagolása kihagyható vagy más elválasztó karaktert ad — pénzügyi
// adatnál ez elfogadhatatlan. Ehelyett egy egyszerű, környezettől független
// tagoló fut, ami minden Node/böngésző build alatt ugyanazt az eredményt adja.

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** "ÉÉÉÉ.HH.NN. – ÉÉÉÉ.HH.NN." — sose add vissza csak az egyik dátumot. */
export function formatPeriod(start: Date, end: Date): string {
  const format = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}.`;
  return `${format(start)} – ${format(end)}`;
}

/** 1234567.5 -> "1 234 567,5" — sima szóköz ezres elválasztóként, vessző tizedesjelként. */
export function groupThousands(value: number): string {
  const isNegative = value < 0;
  const [intPart, fracPart] = Math.abs(value).toString().split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const withFraction = fracPart ? `${grouped},${fracPart}` : grouped;
  return isNegative ? `-${withFraction}` : withFraction;
}

/** "12 450 kWh" — a szám és a mértékegység MINDIG egy string, sose külön mező. */
export function formatQuantity(quantity: number, unit: string): string {
  return `${groupThousands(quantity)} ${unit}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  HUF: "Ft",
  EUR: "€",
};

/** "1 234 567 Ft" — ezres tagolással, pénznem-jelöléssel. */
export function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${groupThousands(Math.round(amount))} ${symbol}`;
}

/** 12450000 -> "12,5 M", 8200 -> "8,2 E" — kompakt jelölés dashboard
 * hőtérkép-celláknak és KPI-kártyáknak, ahol a teljes ezres tagolás túl sok helyet foglalna. */
export function formatCompactAmount(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")} E`;
  return `${sign}${Math.round(abs)}`;
}
