import { z } from "zod";

export const siteCategoryValues = ["BUILDING", "ACTIVITY", "TRANSPORT"] as const;

export const consumptionSiteSchema = z.object({
  customerId: z.string().trim().min(1, "Az ügyfél megadása kötelező."),
  name: z.string().trim().min(1, "A megnevezés megadása kötelező."),
  address: z.string().trim().nullable().optional(),
  category: z.enum(siteCategoryValues, {
    errorMap: () => ({ message: "A kategória megadása kötelező (Épület / Tevékenység / Szállítás)." }),
  }),
});

export type ConsumptionSiteInput = z.infer<typeof consumptionSiteSchema>;
