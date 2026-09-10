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

  const [invoices, co2Factors] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        grossAmount: true,
        netAmount: true,
        currency: true,
        quantity: true,
        unitPrice: true,
        periodStart: true,
        unit: { select: { name: true, kwhPerUnit: true } },
        consumptionSite: { select: { id: true, name: true, category: true } },
        energyType: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.cO2Factor.findMany({ select: { energyTypeId: true, year: true, kgCo2PerKwh: true } }),
  ]);

  const co2FactorByKey = new Map<string, number>();
  co2Factors.forEach((f) => co2FactorByKey.set(`${f.energyTypeId}::${f.year}`, f.kgCo2PerKwh));

  function co2KgFor(inv: (typeof invoices)[number]): number | null {
    const factor = co2FactorByKey.get(`${inv.energyType.id}::${inv.periodStart.getFullYear()}`);
    if (factor === undefined) return null;
    return inv.quantity * inv.unit.kwhPerUnit * factor;
  }

  // Domináns pénznem — a szűrt számlák többsége milyen pénznemben van; csak
  // ennek megfelelő tételeket összegezzük.
  const currencyCounts = new Map<string, number>();
  invoices.forEach((inv) => currencyCounts.set(inv.currency, (currencyCounts.get(inv.currency) ?? 0) + 1));
  const currency = Array.from(currencyCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "HUF";
  const inCurrency = invoices.filter((inv) => inv.currency === currency);

  const totalGross = inCurrency.reduce((sum, inv) => sum + inv.grossAmount, 0);
  const totalNet = inCurrency.reduce((sum, inv) => sum + inv.netAmount, 0);

  let totalCo2Kg = 0;
  let co2FactorMissing = false;
  invoices.forEach((inv) => {
    const kg = co2KgFor(inv);
    if (kg === null) co2FactorMissing = true;
    else totalCo2Kg += kg;
  });

  // Fogyasztás energianem + mértékegység szerint — sose összegezzünk különböző
  // mértékegységeket egyetlen számmá.
  const quantityMap = new Map<
    string,
    { energyTypeCode: string; energyTypeName: string; unit: string; quantity: number }
  >();
  invoices.forEach((inv) => {
    const key = `${inv.energyType.id}::${inv.unit.name}`;
    const existing = quantityMap.get(key);
    if (existing) existing.quantity += inv.quantity;
    else
      quantityMap.set(key, {
        energyTypeCode: inv.energyType.code,
        energyTypeName: inv.energyType.name,
        unit: inv.unit.name,
        quantity: inv.quantity,
      });
  });

  const unitPriceAgg = new Map<
    string,
    { energyTypeCode: string; energyTypeName: string; unit: string; sum: number; count: number }
  >();
  invoices.forEach((inv) => {
    if (inv.unitPrice === null) return;
    const key = `${inv.energyType.id}::${inv.unit.name}`;
    const existing = unitPriceAgg.get(key);
    if (existing) {
      existing.sum += inv.unitPrice;
      existing.count += 1;
    } else {
      unitPriceAgg.set(key, {
        energyTypeCode: inv.energyType.code,
        energyTypeName: inv.energyType.name,
        unit: inv.unit.name,
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
    const existing = costBySiteMap.get(inv.consumptionSite.id);
    if (existing) existing.total += inv.grossAmount;
    else costBySiteMap.set(inv.consumptionSite.id, { siteName: inv.consumptionSite.name, total: inv.grossAmount });
  });

  // Kategória szerinti bontás (Épület / Tevékenység / Szállítás) — a
  // NYUDUVIZIG "összesítő" táblázatának megfelelően, energia mennyiség
  // (kWh-ra átszámítva) és CO2 szerint is.
  const categoryLabels: Record<string, string> = { BUILDING: "Épületek", ACTIVITY: "Tevékenység", TRANSPORT: "Szállítás" };
  const categoryMap = new Map<string, { category: string; label: string; kwh: number; co2Kg: number; costGross: number }>();
  invoices.forEach((inv) => {
    const category = inv.consumptionSite.category;
    const existing = categoryMap.get(category) ?? {
      category,
      label: categoryLabels[category] ?? category,
      kwh: 0,
      co2Kg: 0,
      costGross: 0,
    };
    existing.kwh += inv.quantity * inv.unit.kwhPerUnit;
    const kg = co2KgFor(inv);
    if (kg !== null) existing.co2Kg += kg;
    if (inv.currency === currency) existing.costGross += inv.grossAmount;
    categoryMap.set(category, existing);
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
    const key = `${month}::${inv.consumptionSite.id}`;
    const existing = heatmapMap.get(key);
    if (existing) existing.total += inv.grossAmount;
    else
      heatmapMap.set(key, {
        month,
        siteId: inv.consumptionSite.id,
        siteName: inv.consumptionSite.name,
        total: inv.grossAmount,
      });
  });

  // Előző, azonos hosszúságú időszak — csak akkor számítható, ha a
  // felhasználó explicit dátumintervallumot állított be.
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
    totalCo2Kg,
    co2FactorMissing,
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
    byCategory: Array.from(categoryMap.values()),
    monthlyTrend,
    heatmap: Array.from(heatmapMap.values()),
  });
}
