import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "A név megadása kötelező."),
  taxNumber: z.string().trim().nullable().optional(),
  contactName: z.string().trim().nullable().optional(),
  contactEmail: z.string().trim().email("Érvénytelen email cím.").nullable().optional().or(z.literal("")),
  contactPhone: z.string().trim().nullable().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
