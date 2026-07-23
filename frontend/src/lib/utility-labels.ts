// Fixed categorical color order (validated palette, see dataviz skill) —
// mapped by utility type identity, not by render order, so a type's color
// never shifts when a filter changes which types are present.
export const UTILITY_LABELS: Record<string, string> = {
  electricity: "Villamos energia",
  gas: "Földgáz",
  water: "Víz",
  sewage: "Csatorna",
  district_heating: "Távhő",
  waste: "Hulladékgazdálkodás",
};

export const UTILITY_COLORS: Record<string, string> = {
  electricity: "#2a78d6",
  gas: "#eb6834",
  water: "#1baf7a",
  sewage: "#eda100",
  district_heating: "#e87ba4",
  waste: "#008300",
};
