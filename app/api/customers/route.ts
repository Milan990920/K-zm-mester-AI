export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.trim();

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { taxNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { consumptionSites: true, invoices: true } } },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, contactEmail: parsed.data.contactEmail || null },
  });
  return NextResponse.json(customer, { status: 201 });
}
