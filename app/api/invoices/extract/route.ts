export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractInvoiceData } from "@/lib/invoiceExtraction";

const MAX_EXTRACT_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Nincs csatolt fájl." }, { status: 422 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Csak PDF fájlból lehet automatikusan adatot felismerni." }, { status: 422 });
  }
  if (file.size > MAX_EXTRACT_BYTES) {
    return NextResponse.json({ error: "A fájl mérete meghaladja a 15 MB-os korlátot." }, { status: 422 });
  }

  // A "pdf-parse/lib/pdf-parse.js" közvetlen importja szándékos: a csomag
  // gyökér index.js-e futásidőben egy debug-módú tesztfájlt próbál beolvasni,
  // ha nem require.parent-ből hívják — ezt kerüljük el a belső modul
  // közvetlen importálásával.
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = pdfParseModule.default ?? pdfParseModule;

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } catch {
    return NextResponse.json({ error: "A PDF nem olvasható be (sérült vagy nem szöveges tartalmú fájl)." }, { status: 422 });
  }

  const extracted = extractInvoiceData(text);

  const matchedCustomer = extracted.customerTaxNumber
    ? await prisma.customer.findFirst({ where: { taxNumber: extracted.customerTaxNumber } })
    : null;

  let matchedConsumptionSiteId: string | null = null;
  let matchedMeasurementPointId: string | null = null;
  let matchedEnergyTypeId: string | null = null;

  if (extracted.podCode) {
    const measurementPoint = await prisma.measurementPoint.findFirst({
      where: {
        podCode: extracted.podCode,
        ...(matchedCustomer ? { consumptionSite: { customerId: matchedCustomer.id } } : {}),
      },
      include: { consumptionSite: true, energyType: true },
    });
    if (measurementPoint) {
      matchedConsumptionSiteId = measurementPoint.consumptionSiteId;
      matchedMeasurementPointId = measurementPoint.id;
      matchedEnergyTypeId = measurementPoint.energyTypeId;
    }
  }

  if (!matchedEnergyTypeId && extracted.energyTypeGuess) {
    const energyType = await prisma.energyType.findUnique({ where: { code: extracted.energyTypeGuess } });
    if (energyType) matchedEnergyTypeId = energyType.id;
  }

  // Ha az energianem ismert és a PDF-ből felismertünk egy mértékegység-nevet,
  // próbáljuk megtalálni a hozzá tartozó Unit-ot (az űrlap unitId-t vár, nem
  // szabad szöveget).
  let matchedUnitId: string | null = null;
  if (matchedEnergyTypeId && extracted.unit) {
    const unit = await prisma.unit.findFirst({
      where: { energyTypeId: matchedEnergyTypeId, name: { equals: extracted.unit, mode: "insensitive" } },
    });
    matchedUnitId = unit?.id ?? null;
  }

  return NextResponse.json({
    extracted,
    matchedCustomerId: matchedCustomer?.id ?? null,
    matchedConsumptionSiteId,
    matchedMeasurementPointId,
    matchedEnergyTypeId,
    matchedUnitId,
  });
}
