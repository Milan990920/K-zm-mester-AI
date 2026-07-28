export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteSchema } from "@/lib/validations/site";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = siteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const site = await prisma.site.create({ data: parsed.data });
  return NextResponse.json(site, { status: 201 });
}
