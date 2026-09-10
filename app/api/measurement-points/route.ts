export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { measurementPointSchema } from "@/lib/validations/measurementPoint";
import { podFormatWarning } from "@/lib/validations/pod";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = measurementPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const energyType = await prisma.energyType.findUnique({ where: { id: parsed.data.energyTypeId } });
  if (!energyType) {
    return NextResponse.json({ errors: { energyTypeId: ["Ismeretlen energianem."] } }, { status: 422 });
  }

  const measurementPoint = await prisma.measurementPoint.create({ data: parsed.data });
  const warning = podFormatWarning(energyType.code, parsed.data.podCode);

  return NextResponse.json({ measurementPoint, warning }, { status: 201 });
}
