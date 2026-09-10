import { z } from "zod";

// A Nyugat-dunántúli Vízügyi Igazgatóság feltöltött "Szakreferens
// alaptáblázat" excel-je alapján valós energianem-készlet: a szakreferensi
// energiajelentés (2015. évi LVII. tv.) kWh-ban kifejezhető
// energiahordozókra vonatkozik — ezért víz/csatorna szándékosan NEM szerepel
// itt (nincs értelmes kg CO2/kWh tényezőjük). Az EnergyType tábla
// admin-szerkeszthető, új sor bármikor felvehető.
export const INITIAL_ENERGY_TYPES = [
  { code: "electricity", name: "Villamos energia", badgeColor: "#2F6FA3", sortOrder: 1 },
  { code: "gas", name: "Földgáz", badgeColor: "#C97A2E", sortOrder: 2 },
  { code: "wood_chips", name: "Faapríték", badgeColor: "#6B8F4E", sortOrder: 3 },
  { code: "fuel", name: "Üzemanyag", badgeColor: "#6B4F8A", sortOrder: 4 },
] as const;

// Az egyes energianemekhez tartozó induló mértékegységek + kWh-átváltási
// tényezőik — az excel táblázatban ténylegesen szereplő mértékegységek.
export const INITIAL_UNITS: Record<string, { name: string; kwhPerUnit: number }[]> = {
  electricity: [
    { name: "kWh", kwhPerUnit: 1 },
    { name: "MWh", kwhPerUnit: 1000 },
  ],
  gas: [
    { name: "m³", kwhPerUnit: 10.37 },
    { name: "GJ", kwhPerUnit: 277.78 },
    { name: "MWh", kwhPerUnit: 1000 },
  ],
  wood_chips: [
    { name: "kg", kwhPerUnit: 3.6 },
    { name: "m³", kwhPerUnit: 900 },
  ],
  fuel: [
    { name: "liter benzin", kwhPerUnit: 9.1 },
    { name: "liter gázolaj", kwhPerUnit: 10.0 },
    { name: "kWh", kwhPerUnit: 1 },
  ],
};

export const energyTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "A kód megadása kötelező.")
    .regex(/^[a-z][a-z0-9_]*$/, "A kód csak kisbetűket, számokat és aláhúzást tartalmazhat."),
  name: z.string().trim().min(1, "A megnevezés megadása kötelező."),
  badgeColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "A szín hex formátumban adható meg (pl. #2F6FA3).")
    .default("#5C6B63"),
  sortOrder: z.coerce.number().int().default(0),
});

export type EnergyTypeInput = z.infer<typeof energyTypeSchema>;

export const unitSchema = z.object({
  energyTypeId: z.string().trim().min(1, "Az energianem megadása kötelező."),
  name: z.string().trim().min(1, "A mértékegység neve kötelező."),
  kwhPerUnit: z.coerce.number().positive("A kWh-átváltási tényezőnek pozitívnak kell lennie."),
});

export type UnitInput = z.infer<typeof unitSchema>;

export const co2FactorSchema = z.object({
  energyTypeId: z.string().trim().min(1, "Az energianem megadása kötelező."),
  year: z.coerce.number().int().min(2000).max(2100, "Érvénytelen év."),
  kgCo2PerKwh: z.coerce.number().min(0, "A CO2-tényező nem lehet negatív."),
});

export type CO2FactorInput = z.infer<typeof co2FactorSchema>;
