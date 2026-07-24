"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummary, fetchDashboardSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UTILITY_COLORS, UTILITY_LABELS } from "@/lib/utility-labels";
import { ChartSeries, MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { StatTile } from "@/components/charts/StatTile";
import { PageShell } from "@/components/layout/PageShell";
import { TopNav } from "@/components/layout/TopNav";

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
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Betöltés...</p>
      </main>
    );
  }

  const months = buildLastMonths(12);

  const costSeries: ChartSeries[] = [
    {
      key: "cost",
      label: "Bruttó összeg",
      color: "var(--accent)",
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
    <PageShell>
      <TopNav active="dashboard" role={user.role} onLogout={logout} />

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
          <p className="text-sm text-faint">Hamarosan elérhető</p>
        </DashboardCard>
      </div>
    </PageShell>
  );
}

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="section-title">{title}</h2>
      {children}
    </div>
  );
}
