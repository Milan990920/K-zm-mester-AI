export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { measurementPointSchema } from "@/lib/validations/measurementPoint";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = measurementPointSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const measurementPoint = await prisma.measurementPoint.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(measurementPoint);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.measurementPoint.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
