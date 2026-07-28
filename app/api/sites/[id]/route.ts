export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteSchema } from "@/lib/validations/site";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = siteSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const site = await prisma.site.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(site);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.site.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
