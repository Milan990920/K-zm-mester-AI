export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      consumptionSites: {
        orderBy: { name: "asc" },
        include: {
          measurementPoints: {
            orderBy: { podCode: "asc" },
            include: { energyType: true },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Az ügyfél nem található." }, { status: 404 });
  }
  return NextResponse.json(customer);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(customer);
}
