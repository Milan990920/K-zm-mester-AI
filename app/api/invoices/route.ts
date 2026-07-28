export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInvoiceSchema } from "@/lib/validations/invoice";
import { findDuplicateWarnings } from "@/lib/validations/duplicate";
import { formDataToInvoicePayload } from "@/lib/formDataToInvoicePayload";
import { InvalidAttachmentError, saveAttachment } from "@/lib/storage";
import { computeUnitPrice, computeVatAndGross } from "@/lib/calculations/pricing";

function csv(value: string | null): string[] | undefined {
  return value ? value.split(",").filter(Boolean) : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const customerId = params.get("customerId");
  const meteringPointId = params.get("meteringPointId");
  const siteIds = csv(params.get("siteIds"));
  const meteringPointIds = csv(params.get("meteringPointIds"));
  const energyTypeIds = csv(params.get("energyTypeIds"));
  const provider = params.get("provider");
  const paymentStatus = params.get("paymentStatus");
  const periodFrom = params.get("periodFrom");
  const periodTo = params.get("periodTo");
  const q = params.get("q")?.trim();

  // SPEC.md 5.2 — a szűrők ÉS-logikával kombinálódnak.
  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (meteringPointId) where.meteringPointId = meteringPointId;
  if (siteIds) where.siteId = { in: siteIds };
  if (meteringPointIds) where.meteringPointId = { in: meteringPointIds };
  if (energyTypeIds) where.energyTypeId = { in: energyTypeIds };
  if (provider) where.providerName = { contains: provider, mode: "insensitive" };
  if (paymentStatus) where.paymentStatus = paymentStatus;
  // Az időszak-szűrő azokat a számlákat adja vissza, amelyek elszámolási
  // időszaka átfedésben van a kiválasztott intervallummal (nem azt várja
  // el, hogy a számla teljes egészében bele essen) — ez felel meg annak,
  // amit a "aktuális hónap/negyedév/év" gyorsgomboktól elvár a felhasználó.
  if (periodFrom) where.periodEnd = { gte: new Date(periodFrom) };
  if (periodTo) where.periodStart = { lte: new Date(periodTo) };
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { meterSerialNumber: { contains: q, mode: "insensitive" } },
      { meteringPoint: { podCode: { contains: q, mode: "insensitive" } } },
    ];
  }

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
