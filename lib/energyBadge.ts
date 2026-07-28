// SPEC.md 7. pont — energianem szerinti jelvényszínek, csak jelvényeken és
// grafikonokon használva, sose az általános felületen.
export const ENERGY_BADGE_CLASSES: Record<string, string> = {
  electricity: "bg-energy-electricity/10 text-energy-electricity",
  gas: "bg-energy-gas/10 text-energy-gas",
  district_heating: "bg-energy-district_heating/10 text-energy-district_heating",
  water: "bg-energy-water/10 text-energy-water",
  sewage: "bg-energy-sewage/10 text-energy-sewage",
  fuel: "bg-energy-fuel/10 text-energy-fuel",
};

export function energyBadgeClass(code: string): string {
  return ENERGY_BADGE_CLASSES[code] ?? "bg-muted/10 text-muted";
}

// Ugyanazok a színek hex formában — a dashboard grafikonjai (SPEC.md 5.4)
// nem tudnak Tailwind osztályt használni SVG fill-ként, ezért kell a
// tailwind.config.ts "energy.*" színeivel megegyező hex-forrás.
export const ENERGY_HEX_COLORS: Record<string, string> = {
  electricity: "#2F6FA3",
  gas: "#C97A2E",
  district_heating: "#B8402F",
  water: "#2E8F92",
  sewage: "#5C6B63",
  fuel: "#6B4F8A",
};

export function energyHexColor(code: string): string {
  return ENERGY_HEX_COLORS[code] ?? "#5C6B63";
}
