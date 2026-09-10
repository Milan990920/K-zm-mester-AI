import { Prisma } from "@prisma/client";

// A szűrők ÉS-logikával kombinálódnak; ugyanez a szűrő-nyelvtan szolgálja ki
// a számlalistát (/api/invoices) és a dashboardot (/api/dashboard), hogy a
// két nézet sose térhessen el ugyanazon a szűrőállapoton.

function csv(value: string | null): string[] | undefined {
  return value ? value.split(",").filter(Boolean) : undefined;
}

export function buildInvoiceWhere(params: URLSearchParams): Prisma.InvoiceWhereInput {
  const customerId = params.get("customerId");
  const measurementPointId = params.get("measurementPointId");
  const consumptionSiteIds = csv(params.get("consumptionSiteIds"));
  const measurementPointIds = csv(params.get("measurementPointIds"));
  const energyTypeIds = csv(params.get("energyTypeIds"));
  const provider = params.get("provider");
  const paymentStatus = params.get("paymentStatus");
  const periodFrom = params.get("periodFrom");
  const periodTo = params.get("periodTo");
  const q = params.get("q")?.trim();

  const where: Prisma.InvoiceWhereInput = {};
  if (customerId) where.customerId = customerId;
  if (measurementPointId) where.measurementPointId = measurementPointId;
  if (consumptionSiteIds) where.consumptionSiteId = { in: consumptionSiteIds };
  if (measurementPointIds) where.measurementPointId = { in: measurementPointIds };
  if (energyTypeIds) where.energyTypeId = { in: energyTypeIds };
  if (provider) where.providerName = { contains: provider, mode: "insensitive" };
  if (paymentStatus) where.paymentStatus = paymentStatus as Prisma.InvoiceWhereInput["paymentStatus"];
  // Az időszak-szűrő azokat a számlákat adja vissza, amelyek elszámolási
  // időszaka átfedésben van a kiválasztott intervallummal (nem azt várja el,
  // hogy a számla teljes egészében bele essen).
  if (periodFrom) where.periodEnd = { gte: new Date(periodFrom) };
  if (periodTo) where.periodStart = { lte: new Date(periodTo) };
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { meterSerialNumber: { contains: q, mode: "insensitive" } },
      { measurementPoint: { podCode: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

/** Az aktuálisan szűrt intervallummal azonos hosszúságú, közvetlenül megelőző
 * időszak — a dashboard "előző időszakhoz képest" KPI-jához. Csak akkor
 * számítható, ha a felhasználó explicit dátumintervallumot választott. */
export function previousPeriodRange(
  periodFrom: string | null,
  periodTo: string | null,
): { from: Date; to: Date } | null {
  if (!periodFrom || !periodTo) return null;
  const from = new Date(periodFrom);
  const to = new Date(periodTo);
  const lengthMs = to.getTime() - from.getTime();
  if (lengthMs < 0) return null;
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom, to: prevTo };
}
