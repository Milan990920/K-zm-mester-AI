"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardSummary, fetchDashboardSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UTILITY_COLORS, UTILITY_LABELS } from "@/lib/utility-labels";
import { ChartSeries, MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { StatTile } from "@/components/charts/StatTile";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  partner: "Partner",
  customer_admin: "Ügyfél adminisztrátor",
  customer_user: "Ügyfél felhasználó",
};

function formatCurrency(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString("hu-HU")} ${currency}`;
}

function buildLastMonths(count: number): string[] {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout, accessToken } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchDashboardSummary(accessToken).then(setSummary).catch(() => setSummary(null));
  }, [accessToken]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  const months = buildLastMonths(12);

  const costSeries: ChartSeries[] = [
    {
      key: "cost",
      label: "Bruttó összeg",
      color: UTILITY_COLORS.electricity,
      valuesByMonth: Object.fromEntries(
        (summary?.monthly_costs ?? []).map((m) => [m.month, m.gross_amount_sum]),
      ),
    },
  ];
  const costCurrency = summary?.monthly_costs[0]?.currency ?? "HUF";

  const consumptionUtilityTypes = Array.from(
    new Set((summary?.monthly_consumption ?? []).map((c) => c.utility_type)),
  );
  const consumptionSeries: ChartSeries[] = consumptionUtilityTypes.map((utilityType) => ({
    key: utilityType,
    label: UTILITY_LABELS[utilityType] ?? utilityType,
    color: UTILITY_COLORS[utilityType] ?? "#898781",
    valuesByMonth: Object.fromEntries(
      (summary?.monthly_consumption ?? [])
        .filter((c) => c.utility_type === utilityType)
        .map((c) => [c.month, c.consumption_sum]),
    ),
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Közmű Mester</h1>
            <p className="text-sm text-slate-500">
              Bejelentkezve mint {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Számla feltöltése
            </Link>
            <Link
              href="/invoices"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Számlák
            </Link>
            {user.role === "customer_admin" && (
              <Link
                href="/users"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Felhasználók
              </Link>
            )}
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Kijelentkezés
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardCard title="Havi költség (utolsó 12 hónap)">
            <MonthlyBarChart
              months={months}
              series={costSeries}
              valueFormatter={(v) => formatCurrency(v, costCurrency)}
              emptyLabel="Még nincs elegendő adat a grafikonhoz"
            />
          </DashboardCard>

          <DashboardCard title="Havi fogyasztás közműnként">
            <MonthlyBarChart
              months={months}
              series={consumptionSeries}
              valueFormatter={(v) => v.toLocaleString("hu-HU")}
              emptyLabel="Még nincs elegendő adat a grafikonhoz"
            />
          </DashboardCard>

          <DashboardCard title="Éves költség (idei év)">
            <StatTile
              label="Összesen"
              value={
                summary
                  ? formatCurrency(summary.yearly_total_cost, summary.yearly_total_cost_currency)
                  : "—"
              }
            />
          </DashboardCard>

          <DashboardCard title="AI asszisztens">
            <p className="text-sm text-slate-400">Hamarosan elérhető</p>
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
