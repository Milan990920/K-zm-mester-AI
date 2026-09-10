import { z } from "zod";

export const invoiceTypeValues = ["SETTLEMENT", "PARTIAL", "CONSOLIDATED", "CREDIT"] as const;
export const paymentStatusValues = ["OPEN", "PAID", "OVERDUE"] as const;
export const invoiceSourceValues = ["MANUAL", "PDF_UPLOAD"] as const;

const invoiceShape = {
  customerId: z.string().trim().min(1).nullable().optional(),
  consumptionSiteId: z.string().trim().min(1).nullable().optional(),
  measurementPointId: z.string().trim().min(1).nullable().optional(),
  energyTypeId: z.string().trim().min(1).nullable().optional(),
  providerName: z.string().trim().min(1).nullable().optional(),
  invoiceNumber: z.string().trim().min(1).nullable().optional(),
  issueDate: z.coerce.date().nullable().optional(),
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  quantity: z.coerce.number().positive("A mennyiségnek pozitívnak kell lennie.").nullable().optional(),
  unitId: z.string().trim().min(1).nullable().optional(),
  meterSerialNumber: z.string().trim().nullable().optional(),
  netAmount: z.coerce.number().nullable().optional(),
  vatRate: z.coerce.number().min(0).nullable().optional(),
  vatAmount: z.coerce.number().nullable().optional(),
  grossAmount: z.coerce.number().nullable().optional(),
  currency: z.string().trim().min(1).default("HUF"),
  unitPrice: z.coerce.number().nullable().optional(),
  invoiceType: z.enum(invoiceTypeValues).nullable().optional(),
  paymentStatus: z.enum(paymentStatusValues).default("OPEN"),
  attachmentPath: z.string().trim().nullable().optional(),
  sourceType: z.enum(invoiceSourceValues).default("MANUAL"),
  recordedBy: z.string().trim().nullable().optional(),
  isDraft: z.boolean().default(false),
};

// Ezek a mezők kötelezők, kivéve ha a számla piszkozatként kerül mentésre.
const REQUIRED_WHEN_FINAL = [
  "customerId",
  "consumptionSiteId",
  "measurementPointId",
  "energyTypeId",
  "providerName",
  "quantity",
  "unitId",
  "grossAmount",
] as const;

/**
 * `allowedUnitIds` a kiválasztott energyType-hoz tartozó Unit-ok id-jei —
 * a mennyiség/mértékegység pár csak eszerint kombinálható. Null-t adj át, ha
 * az energianem még nincs kiválasztva (pl. első renderkor); ekkor a
 * mértékegység-ellenőrzés kimarad, a többi szabály nem.
 */
export function buildInvoiceSchema(allowedUnitIds: string[] | null) {
  return z.object(invoiceShape).superRefine((data, ctx) => {
    if (!data.isDraft) {
      for (const field of REQUIRED_WHEN_FINAL) {
        if (data[field] === null || data[field] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: "Végleges számlánál ez a mező kötelező (vagy mentsd piszkozatként).",
          });
        }
      }
      if (!data.periodStart || !data.periodEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["periodStart"],
          message: "Végleges számlánál a számlázási időszak kezdete és vége kötelező.",
        });
      }
    }

    // Akkor is érvényes, ha a számla piszkozat, hogy hibás dátumpár sose
    // kerülhessen be még piszkozatként sem.
    if (data.periodStart && data.periodEnd && data.periodStart >= data.periodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodEnd"],
        message: "A számlázási időszak kezdetének korábbinak kell lennie, mint a végének.",
      });
    }

    if (data.unitId && allowedUnitIds && !allowedUnitIds.includes(data.unitId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "A kiválasztott mértékegység nem tartozik a kiválasztott energianemhez.",
      });
    }
  });
}

export type InvoiceInput = z.infer<ReturnType<typeof buildInvoiceSchema>>;
