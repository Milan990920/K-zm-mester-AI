export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { energyTypeSchema } from "@/lib/validations/energyType";

export async function GET() {
  const energyTypes = await prisma.energyType.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      units: { orderBy: { name: "asc" } },
      co2Factors: { orderBy: { year: "desc" } },
    },
  });
  return NextResponse.json(energyTypes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = energyTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const energyType = await prisma.energyType.create({ data: parsed.data });
  return NextResponse.json(energyType, { status: 201 });
}
