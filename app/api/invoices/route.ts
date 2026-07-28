export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInvoiceSchema } from "@/lib/validations/invoice";
import { findDuplicateWarnings } from "@/lib/validations/duplicate";
import { formDataToInvoicePayload } from "@/lib/formDataToInvoicePayload";
import { InvalidAttachmentError, saveAttachment } from "@/lib/storage";
import { computeUnitPrice, computeVatAndGross } from "@/lib/calculations/pricing";
import { buildInvoiceWhere } from "@/lib/invoiceFilters";

export async function GET(request: NextRequest) {
  const where = buildInvoiceWhere(request.nextUrl.searchParams);
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issueDate: "desc" },
    include: { customer: true, site: true, meteringPoint: true, energyType: true },
  });
  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload = formDataToInvoicePayload(formData);

  let allowedUnits: string[] | null = null;
  if (payload.energyTypeId) {
    const energyType = await prisma.energyType.findUnique({ where: { id: payload.energyTypeId as string } });
    allowedUnits = energyType?.allowedUnits ?? null;
  }

  const parsed = buildInvoiceSchema(allowedUnits).safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const data = parsed.data;

  // SPEC.md 3.1 — a bruttó összeg és az egységár számolható, ha nincs
  // kézzel megadva; csak akkor számolunk, ha a hozzávaló mezők megvannak
  // (piszkozatnál ez nem garantált).
  let netAmount = data.netAmount ?? undefined;
  let vatAmount = data.vatAmount ?? undefined;
  let grossAmount = data.grossAmount ?? undefined;
  if (netAmount !== undefined && data.vatRate !== undefined && data.vatRate !== null && grossAmount === undefined) {
    const computed = computeVatAndGross(netAmount, data.vatRate);
    vatAmount = vatAmount ?? computed.vatAmount;
    grossAmount = grossAmount ?? computed.grossAmount;
  }
  const unitPrice =
    data.unitPrice ?? (grossAmount !== undefined && data.quantity ? computeUnitPrice(grossAmount, data.quantity) : null);

  let warnings: string[] = [];
  if (data.meteringPointId && data.providerName && data.invoiceNumber && data.periodStart && data.periodEnd) {
    const existing = await prisma.invoice.findMany({
      where: { meteringPointId: data.meteringPointId, providerName: data.providerName },
      select: { id: true, invoiceNumber: true, periodStart: true, periodEnd: true },
    });
    warnings = findDuplicateWarnings(
      { invoiceNumber: data.invoiceNumber, periodStart: data.periodStart, periodEnd: data.periodEnd },
      existing,
    );
  }

  let attachmentPath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      attachmentPath = await saveAttachment(file);
    } catch (error) {
      if (error instanceof InvalidAttachmentError) {
        return NextResponse.json({ errors: { file: [error.message] } }, { status: 422 });
      }
      throw error;
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      customerId: data.customerId!,
      siteId: data.siteId!,
      meteringPointId: data.meteringPointId!,
      energyTypeId: data.energyTypeId!,
      providerName: data.providerName ?? "",
      invoiceNumber: data.invoiceNumber ?? "",
      issueDate: data.issueDate ?? new Date(),
      periodStart: data.periodStart ?? new Date(),
      periodEnd: data.periodEnd ?? new Date(),
      dueDate: data.dueDate,
      quantity: data.quantity ?? 0,
      unit: data.unit ?? "",
      meterSerialNumber: data.meterSerialNumber,
      netAmount: netAmount ?? 0,
      vatRate: data.vatRate ?? 0,
      vatAmount: vatAmount ?? 0,
      grossAmount: grossAmount ?? 0,
      currency: data.currency,
      unitPrice,
      invoiceType: data.invoiceType ?? "SETTLEMENT",
      paymentStatus: data.paymentStatus,
      attachmentPath,
      sourceType: data.sourceType,
      isDraft: data.isDraft,
      recordedBy: data.recordedBy,
    },
  });

  return NextResponse.json({ invoice, warnings }, { status: 201 });
}
