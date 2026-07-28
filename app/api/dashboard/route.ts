export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInvoiceWhere, previousPeriodRange } from "@/lib/invoiceFilters";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const where = buildInvoiceWhere(params);

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      grossAmount: true,
      netAmount: true,
      currency: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      periodStart: true,
      site: { select: { id: true, name: true } },
      energyType: { select: { id: true, code: true, name: true } },
    },
  });

  // Domináns pénznem — a szűrt számlák többsége milyen pénznemben van; csak
  // ennek megfelelő tételeket összegezzük. A SPEC.md nem definiál
  // multi-currency összesítést, ezt a gyakorlatban egy ügyfélnél sem várjuk.
  const currencyCounts = new Map<string, number>();
  invoices.forEach((inv) => currencyCounts.set(inv.currency, (currencyCounts.get(inv.currency) ?? 0) + 1));
  const currency = Array.from(currencyCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "HUF";
  const inCurrency = invoices.filter((inv) => inv.currency === currency);

  const totalGross = inCurrency.reduce((sum, inv) => sum + inv.grossAmount, 0);
  const totalNet = inCurrency.reduce((sum, inv) => sum + inv.netAmount, 0);

  // Fogyasztás energianem + mértékegység szerint — sose összegezzünk különböző
  // mértékegységeket egyetlen számmá (SPEC.md 5.3/5.4).
  const quantityMap = new Map<
    string,
    { energyTypeCode: string; energyTypeName: string; unit: string; quantity: number }
  >();
  invoices.forEach((inv) => {
    const key = `${inv.energyType.id}::${inv.unit}`;
    const existing = quantityMap.get(key);
    if (existing) existing.quantity += inv.quantity;
    else
      quantityMap.set(key, {
        energyTypeCode: inv.energyType.code,
        energyTypeName: inv.energyType.name,
        unit: inv.unit,
        quantity: inv.quantity,
      });
  });

  const unitPriceAgg = new Map<
    string,
    { energyTypeCode: string; energyTypeName: string; unit: string; sum: number; count: number }
  >();
  invoices.forEach((inv) => {
    if (inv.unitPrice === null) return;
    const key = `${inv.energyType.id}::${inv.unit}`;
    const existing = unitPriceAgg.get(key);
    if (existing) {
      existing.sum += inv.unitPrice;
      existing.count += 1;
    } else {
      unitPriceAgg.set(key, {
        energyTypeCode: inv.energyType.code,
        energyTypeName: inv.energyType.name,
        unit: inv.unit,
        sum: inv.unitPrice,
        count: 1,
      });
    }
  });

  const costByEnergyTypeMap = new Map<string, { energyTypeCode: string; energyTypeName: string; total: number }>();
  inCurrency.forEach((inv) => {
    const existing = costByEnergyTypeMap.get(inv.energyType.id);
    if (existing) existing.total += inv.grossAmount;
    else
      costByEnergyTypeMap.set(inv.energyType.id, {
        energyTypeCode: inv.energyType.code,
        energyTypeName: inv.energyType.name,
        total: inv.grossAmount,
      });
  });

  const costBySiteMap = new Map<string, { siteName: string; total: number }>();
  inCurrency.forEach((inv) => {
    const existing = costBySiteMap.get(inv.site.id);
    if (existing) existing.total += inv.grossAmount;
    else costBySiteMap.set(inv.site.id, { siteName: inv.site.name, total: inv.grossAmount });
  });

  const monthlyTrendMap = new Map<string, number>();
  inCurrency.forEach((inv) => {
    const key = monthKey(inv.periodStart);
    monthlyTrendMap.set(key, (monthlyTrendMap.get(key) ?? 0) + inv.grossAmount);
  });
  const monthlyTrend = Array.from(monthlyTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const heatmapMap = new Map<string, { month: string; siteId: string; siteName: string; total: number }>();
  inCurrency.forEach((inv) => {
    const month = monthKey(inv.periodStart);
    const key = `${month}::${inv.site.id}`;
    const existing = heatmapMap.get(key);
    if (existing) existing.total += inv.grossAmount;
    else heatmapMap.set(key, { month, siteId: inv.site.id, siteName: inv.site.name, total: inv.grossAmount });
  });

  // Előző, azonos hosszúságú időszak — csak akkor számítható, ha a
  // felhasználó explicit dátumintervallumot állított be (SPEC.md 5.4).
  const previous = previousPeriodRange(params.get("periodFrom"), params.get("periodTo"));
  let pctChange: number | null = null;
  if (previous) {
    const previousInvoices = await prisma.invoice.findMany({
      where: { ...where, periodEnd: { gte: previous.from }, periodStart: { lte: previous.to } },
      select: { grossAmount: true, currency: true },
    });
    const previousTotal = previousInvoices
      .filter((inv) => inv.currency === currency)
      .reduce((sum, inv) => sum + inv.grossAmount, 0);
    if (previousTotal > 0) pctChange = ((totalGross - previousTotal) / previousTotal) * 100;
  }

  return NextResponse.json({
    currency,
    invoiceCount: invoices.length,
    totalGross,
    totalNet,
    pctChange,
    quantityByEnergyType: Array.from(quantityMap.values()),
    avgUnitPriceByEnergyType: Array.from(unitPriceAgg.values()).map((v) => ({
      energyTypeCode: v.energyTypeCode,
      energyTypeName: v.energyTypeName,
      unit: v.unit,
      avgUnitPrice: v.sum / v.count,
    })),
    costByEnergyType: Array.from(costByEnergyTypeMap.values()),
    costBySite: Array.from(costBySiteMap.values()),
    monthlyTrend,
    heatmap: Array.from(heatmapMap.values()),
  });
}
