import { z } from "zod";

export const siteSchema = z.object({
  customerId: z.string().trim().min(1, "Az ügyfél megadása kötelező."),
  name: z.string().trim().min(1, "A megnevezés megadása kötelező."),
  address: z.string().trim().min(1, "A cím megadása kötelező."),
});

export type SiteInput = z.infer<typeof siteSchema>;
