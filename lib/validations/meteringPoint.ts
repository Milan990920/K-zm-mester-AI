import { z } from "zod";

export const meteringPointSchema = z.object({
  siteId: z.string().trim().min(1, "A fogyasztási hely megadása kötelező."),
  podCode: z.string().trim().min(1, "A POD-kód megadása kötelező."),
  energyTypeId: z.string().trim().min(1, "Az energianem megadása kötelező."),
  providerName: z.string().trim().nullable().optional(),
  networkOperatorName: z.string().trim().nullable().optional(),
  currentMeterSerial: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type MeteringPointInput = z.infer<typeof meteringPointSchema>;
