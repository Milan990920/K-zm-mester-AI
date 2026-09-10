export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumptionSiteSchema } from "@/lib/validations/consumptionSite";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = consumptionSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const consumptionSite = await prisma.consumptionSite.create({ data: parsed.data });
  return NextResponse.json(consumptionSite, { status: 201 });
}
