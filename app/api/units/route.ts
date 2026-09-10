export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unitSchema } from "@/lib/validations/energyType";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const unit = await prisma.unit.create({ data: parsed.data });
  return NextResponse.json(unit, { status: 201 });
}
