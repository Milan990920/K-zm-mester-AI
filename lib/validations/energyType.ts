import { z } from "zod";

// SPEC.md 3.2 — kezdő energianem-készlet, a hozzájuk kizárólag választható
// mértékegységekkel. Ez csak a KEZDŐ adat (seedeléshez) — az EnergyType tábla
// admin-szerkeszthető, új sor bármikor felvehető kódmódosítás nélkül.
export const INITIAL_ENERGY_TYPES = [
  { code: "electricity", name: "Villamos energia", allowedUnits: ["kWh", "MWh"] },
  { code: "gas", name: "Földgáz", allowedUnits: ["m³", "MJ", "GJ"] },
  { code: "district_heating", name: "Távhő", allowedUnits: ["GJ", "MWh"] },
  { code: "water", name: "Víz", allowedUnits: ["m³"] },
  { code: "sewage", name: "Csatorna", allowedUnits: ["m³"] },
  { code: "fuel", name: "Üzemanyag", allowedUnits: ["liter", "kg"] },
] as const;

export const energyTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "A kód megadása kötelező.")
    .regex(/^[a-z][a-z0-9_]*$/, "A kód csak kisbetűket, számokat és aláhúzást tartalmazhat."),
  name: z.string().trim().min(1, "A megnevezés megadása kötelező."),
  allowedUnits: z
    .array(z.string().trim().min(1))
    .min(1, "Legalább egy mértékegységet meg kell adni.")
    .refine((units) => new Set(units).size === units.length, {
      message: "A mértékegységek nem szerepelhetnek duplán.",
    }),
});

export type EnergyTypeInput = z.infer<typeof energyTypeSchema>;
