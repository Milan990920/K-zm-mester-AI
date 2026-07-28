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
