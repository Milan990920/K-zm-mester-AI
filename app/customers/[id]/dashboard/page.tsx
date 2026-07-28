"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InvoiceFilterBar } from "@/components/InvoiceFilterBar";
import { energyBadgeClass, energyHexColor } from "@/lib/energyBadge";
import { formatAmount, formatCompactAmount, formatQuantity, groupThousands } from "@/lib/format";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import type { CustomerDetail } from "@/lib/types";

interface DashboardData {
  currency: string;
  invoiceCount: number;
  totalGross: number;
  totalNet: number;
  pctChange: number | null;
  quantityByEnergyType: { energyTypeCode: string; energyTypeName: string; unit: string; quantity: number }[];
  avgUnitPriceByEnergyType: { energyTypeCode: string; energyTypeName: string; unit: string; avgUnitPrice: number }[];
  costByEnergyType: { energyTypeCode: string; energyTypeName: string; total: number }[];
  costBySite: { siteName: string; total: number }[];
  monthlyTrend: { month: string; total: number }[];
  heatmap: { month: string; siteId: string; siteName: string; total: number }[];
}

interface ExportRow {
  invoiceNumber: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  quantity: number;
  unit: string;
  meterSerialNumber: string | null;
  netAmount: number;
  grossAmount: number;
  currency: string;
  paymentStatus: string;
  customer: { name: string };
  site: { name: string };
  meteringPoint: { podCode: string };
  energyType: { name: string };
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="surface flex flex-col gap-2 p-5">
      <p className="field-label !mb-0">{label}</p>
      {children}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface flex flex-col gap-3 p-5">
      <p className="section-heading">{title}</p>
      <div className="h-[260px] w-full">{children}</div>
    </div>
  );
}

interface TooltipEntry {
  value?: number | string;
  payload?: { energyTypeCode?: string; siteName?: string; total?: number };
}

function ChartTooltipContent({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = Number(payload[0]?.value ?? payload[0]?.payload?.total ?? 0);
  return (
    <div className="surface px-3 py-2 shadow-lg">
      {label !== undefined && <p className="mb-0.5 text-xs text-muted">{label}</p>}
      <p className="font-mono text-[13px] font-semibold text-ink">{formatAmount(value, currency)}</p>
    </div>
  );
}

function csvEscape(value: string): string {
  if (/[",;\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardView />
    </Suspense>
  );
}

function DashboardView() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((res) => res.json())
      .then(setCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("customerId", params.id);
    setData(null);
    fetch(`/api/dashboard?${query.toString()}`)
      .then((res) => res.json())
      .then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, searchParams]);

  const heatmapMonths = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.heatmap.map((cell) => cell.month))).sort();
  }, [data]);

  const heatmapSites = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.heatmap.forEach((cell) => map.set(cell.siteId, cell.siteName));
    return Array.from(map.entries()).map(([siteId, siteName]) => ({ siteId, siteName }));
  }, [data]);

  const heatmapMax = useMemo(() => {
    if (!data) return 0;
    return data.heatmap.reduce((max, cell) => Math.max(max, cell.total), 0);
  }, [data]);

  async function handleExportCsv() {
    if (!customer) return;
    setIsExporting(true);
    try {
      const query = new URLSearchParams(searchParams.toString());
      query.set("customerId", customer.id);
      const res = await fetch(`/api/invoices?${query.toString()}`);
      const invoices: ExportRow[] = await res.json();
      const header = [
        "Ügyfél",
        "Fogyasztási hely",
        "POD",
        "Gyári szám",
        "Szolgáltató",
        "Energianem",
        "Időszak kezdete",
        "Időszak vége",
        "Mennyiség",
        "Mértékegység",
        "Nettó",
        "Bruttó",
        "Pénznem",
        "Fizetési státusz",
        "Számlaszám",
      ];
      const rows = invoices.map((inv) => [
        inv.customer.name,
        inv.site.name,
        inv.meteringPoint.podCode,
        inv.meterSerialNumber ?? "",
        inv.providerName,
        inv.energyType.name,
        inv.periodStart.slice(0, 10),
        inv.periodEnd.slice(0, 10),
        String(inv.quantity),
        inv.unit,
        String(inv.netAmount),
        String(inv.grossAmount),
        inv.currency,
        PAYMENT_STATUS_LABELS[inv.paymentStatus] ?? inv.paymentStatus,
        inv.invoiceNumber,
      ]);
      const csvContent = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n");
      const blob = new Blob([`﻿${csvContent}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szamlak_${customer.name.replace(/\s+/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  if (!customer) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-muted">Betöltés…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link href={`/customers/${customer.id}`} className="link-quiet mb-8 inline-block text-sm text-muted">
        ← {customer.name}
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{customer.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer.id}/invoices?${searchParams.toString()}`} className="btn-outline">
            Számlalista
          </Link>
          <button type="button" onClick={handleExportCsv} disabled={isExporting} className="btn-brass">
            {isExporting ? "Exportálás…" : "CSV export"}
          </button>
        </div>
      </div>

      <InvoiceFilterBar customer={customer} />

      {!data && <p className="text-sm text-muted">Betöltés…</p>}

      {data && data.invoiceCount === 0 && (
        <div className="empty-state">
          <p className="font-display text-base font-medium text-ink">Nincs megjeleníthető adat</p>
          <p className="max-w-sm text-sm text-muted">
            A jelenlegi szűrésnek nem felel meg egyetlen számla sem — tágítsd a szűrőket, vagy rögzíts új számlát.
          </p>
        </div>
      )}

      {data && data.invoiceCount > 0 && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Összes bruttó költség">
              <p className="font-sans text-[32px] font-semibold leading-tight text-ink">
                {formatAmount(data.totalGross, data.currency)}
              </p>
              {data.pctChange !== null && (
                <p className="text-sm text-muted">
                  {data.pctChange >= 0 ? "▲" : "▼"} {groupThousands(Math.abs(Math.round(data.pctChange * 10)) / 10)}%
                  az előző időszakhoz képest
                </p>
              )}
            </StatCard>

            <StatCard label="Számlák száma">
              <p className="font-sans text-[32px] font-semibold leading-tight text-ink">{data.invoiceCount}</p>
              <p className="text-sm text-muted">a jelenlegi szűrésnek megfelelően</p>
            </StatCard>

            <StatCard label="Fogyasztás energianem szerint">
              <div className="flex flex-col gap-1.5">
                {data.quantityByEnergyType.map((row) => (
                  <div key={`${row.energyTypeCode}-${row.unit}`} className="flex items-center justify-between gap-2">
                    <span className={`badge ${energyBadgeClass(row.energyTypeCode)}`}>{row.energyTypeName}</span>
                    <span className="font-mono text-[13px] text-ink">{formatQuantity(row.quantity, row.unit)}</span>
                  </div>
                ))}
              </div>
            </StatCard>

            <StatCard label="Átlagos egységár">
              <div className="flex flex-col gap-1.5">
                {data.avgUnitPriceByEnergyType.length === 0 && (
                  <p className="text-sm text-muted">Nincs számított egységár.</p>
                )}
                {data.avgUnitPriceByEnergyType.map((row) => (
                  <div key={`${row.energyTypeCode}-${row.unit}`} className="flex items-center justify-between gap-2">
                    <span className={`badge ${energyBadgeClass(row.energyTypeCode)}`}>{row.energyTypeName}</span>
                    <span className="font-mono text-[13px] text-ink">
                      {formatAmount(row.avgUnitPrice, data.currency)}/{row.unit}
                    </span>
                  </div>
                ))}
              </div>
            </StatCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Havi trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E4E8E1" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C6B63" }} axisLine={{ stroke: "#E4E8E1" }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5C6B63" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => groupThousands(v)}
                    width={64}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltipContent
                        active={props.active}
                        payload={props.payload as TooltipEntry[]}
                        label={props.label}
                        currency={data.currency}
                      />
                    )}
                    cursor={{ stroke: "#B8863B", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#B8863B"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#B8863B", stroke: "#FFFFFF", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Költség energianem szerint">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.costByEnergyType} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E4E8E1" />
                  <XAxis
                    dataKey="energyTypeName"
                    tick={{ fontSize: 11, fill: "#5C6B63" }}
                    axisLine={{ stroke: "#E4E8E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5C6B63" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => groupThousands(v)}
                    width={64}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltipContent
                        active={props.active}
                        payload={props.payload as TooltipEntry[]}
                        label={props.label}
                        currency={data.currency}
                      />
                    )}
                    cursor={{ fill: "rgba(30,36,34,0.04)" }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {data.costByEnergyType.map((row) => (
                      <Cell key={row.energyTypeCode} fill={energyHexColor(row.energyTypeCode)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Telephelyek összehasonlítása">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.costBySite} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E4E8E1" />
                  <XAxis
                    dataKey="siteName"
                    tick={{ fontSize: 11, fill: "#5C6B63" }}
                    axisLine={{ stroke: "#E4E8E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5C6B63" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => groupThousands(v)}
                    width={64}
                  />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltipContent
                        active={props.active}
                        payload={props.payload as TooltipEntry[]}
                        label={props.label}
                        currency={data.currency}
                      />
                    )}
                    cursor={{ fill: "rgba(30,36,34,0.04)" }}
                  />
                  <Bar dataKey="total" fill="#B8863B" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Hőtérkép — telephely × hónap">
              {heatmapSites.length === 0 || heatmapMonths.length === 0 ? (
                <p className="text-sm text-muted">Nincs elég adat a hőtérképhez.</p>
              ) : (
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-muted">Telephely</th>
                        {heatmapMonths.map((month) => (
                          <th key={month} className="px-1 py-1 text-center font-medium text-muted">
                            {month}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapSites.map(({ siteId, siteName }) => (
                        <tr key={siteId}>
                          <td className="sticky left-0 bg-card px-2 py-1 text-ink">{siteName}</td>
                          {heatmapMonths.map((month) => {
                            const cell = data.heatmap.find((c) => c.siteId === siteId && c.month === month);
                            const total = cell?.total ?? 0;
                            const intensity = heatmapMax > 0 ? total / heatmapMax : 0;
                            return (
                              <td key={month} className="p-0.5">
                                <div
                                  title={total > 0 ? formatAmount(total, data.currency) : undefined}
                                  className="flex h-9 min-w-[52px] items-center justify-center rounded-[4px] font-mono text-[10.5px]"
                                  style={{
                                    backgroundColor:
                                      total > 0 ? `rgba(184,134,59,${0.12 + intensity * 0.78})` : "rgba(30,36,34,0.03)",
                                    color: intensity > 0.55 ? "#FFFFFF" : "#1E2422",
                                  }}
                                >
                                  {total > 0 ? formatCompactAmount(total) : ""}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </main>
  );
}
