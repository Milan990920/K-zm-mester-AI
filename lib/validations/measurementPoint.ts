import { z } from "zod";

export const measurementTypeValues = ["TIME_SERIES", "PROFILE"] as const;
export const measurementPointStatusValues = ["ACTIVE", "INACTIVE"] as const;

export const measurementPointSchema = z.object({
  consumptionSiteId: z.string().trim().min(1, "A fogyasztási hely megadása kötelező."),
  podCode: z.string().trim().min(1, "A POD-kód megadása kötelező."),
  energyTypeId: z.string().trim().min(1, "Az energianem megadása kötelező."),
  providerName: z.string().trim().nullable().optional(),
  networkOperatorName: z.string().trim().nullable().optional(),
  meterSerialNumber: z.string().trim().nullable().optional(),
  measurementType: z.enum(measurementTypeValues).default("PROFILE"),
  status: z.enum(measurementPointStatusValues).default("ACTIVE"),
});

export type MeasurementPointInput = z.infer<typeof measurementPointSchema>;
