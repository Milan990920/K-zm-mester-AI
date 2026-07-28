export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { meteringPointSchema } from "@/lib/validations/meteringPoint";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = meteringPointSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const meteringPoint = await prisma.meteringPoint.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(meteringPoint);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.meteringPoint.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
