export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true, site: true, meteringPoint: true, energyType: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "A számla nem található." }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: { paymentStatus: body.paymentStatus },
  });
  return NextResponse.json(invoice);
}
