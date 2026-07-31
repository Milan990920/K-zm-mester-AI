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

  let matchedSiteId: string | null = null;
  let matchedMeteringPointId: string | null = null;
  let matchedEnergyTypeId: string | null = null;

  if (extracted.podCode) {
    const meteringPoint = await prisma.meteringPoint.findFirst({
      where: { podCode: extracted.podCode, ...(matchedCustomer ? { site: { customerId: matchedCustomer.id } } : {}) },
      include: { site: true, energyType: true },
    });
    if (meteringPoint) {
      matchedSiteId = meteringPoint.siteId;
      matchedMeteringPointId = meteringPoint.id;
      matchedEnergyTypeId = meteringPoint.energyTypeId;
    }
  }

  if (!matchedEnergyTypeId && extracted.energyTypeGuess) {
    const energyType = await prisma.energyType.findUnique({ where: { code: extracted.energyTypeGuess } });
    if (energyType) matchedEnergyTypeId = energyType.id;
  }

  return NextResponse.json({
    extracted,
    matchedCustomerId: matchedCustomer?.id ?? null,
    matchedSiteId,
    matchedMeteringPointId,
    matchedEnergyTypeId,
  });
}
