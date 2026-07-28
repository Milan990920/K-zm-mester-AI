export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { meteringPointSchema } from "@/lib/validations/meteringPoint";
import { podFormatWarning } from "@/lib/validations/pod";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = meteringPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const energyType = await prisma.energyType.findUnique({ where: { id: parsed.data.energyTypeId } });
  if (!energyType) {
    return NextResponse.json({ errors: { energyTypeId: ["Ismeretlen energianem."] } }, { status: 422 });
  }

  const meteringPoint = await prisma.meteringPoint.create({ data: parsed.data });
  const warning = podFormatWarning(energyType.code, parsed.data.podCode);

  return NextResponse.json({ meteringPoint, warning }, { status: 201 });
}
