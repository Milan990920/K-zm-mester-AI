export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { co2FactorSchema } from "@/lib/validations/energyType";

// A CO2-tényező évenként/energianemenként egyedi (SPEC: "CO2Factor —
// energianemenként és évenként verziózva") — ismételt beküldés ugyanarra az
// évre/energianemre frissíti a korábbi értéket, nem duplikál.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = co2FactorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const co2Factor = await prisma.cO2Factor.upsert({
    where: { energyTypeId_year: { energyTypeId: parsed.data.energyTypeId, year: parsed.data.year } },
    update: { kgCo2PerKwh: parsed.data.kgCo2PerKwh },
    create: parsed.data,
  });
  return NextResponse.json(co2Factor, { status: 201 });
}
