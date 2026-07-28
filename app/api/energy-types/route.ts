export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const energyTypes = await prisma.energyType.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(energyTypes);
}
