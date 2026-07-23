"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, Invoice, listInvoices } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const UTILITY_LABELS: Record<string, string> = {
  electricity: "Villamos energia",
  gas: "Földgáz",
  water: "Víz",
  sewage: "Csatorna",
  district_heating: "Távhő",
  waste: "Hulladékgazdálkodás",
};

const VALIDATION_LABELS: Record<Invoice["validation_status"], string> = {
  pending: "Feldolgozás alatt",
  valid: "Rendben",
  invalid: "Hibás",
  needs_review: "Ellenőrzés szükséges",
};

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString("hu-HU")} ${currency}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user, isLoading, accessToken } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    listInvoices(accessToken)
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Ismeretlen hiba történt"))
      .finally(() => setIsFetching(false));
  }, [accessToken]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Számlák</h1>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
            Vissza a dashboardra
          </Link>
        </header>

        {isFetching && <p className="text-sm text-slate-500">Betöltés...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isFetching && !error && invoices.length === 0 && (
          <p className="text-sm text-slate-400">Még nincs feltöltött számla.</p>
        )}

        {invoices.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Számlaszám</th>
                  <th className="px-4 py-3">Közmű</th>
                  <th className="px-4 py-3">Kelte</th>
                  <th className="px-4 py-3">Bruttó összeg</th>
                  <th className="px-4 py-3">Állapot</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{invoice.invoice_number ?? "—"}</td>
                    <td className="px-4 py-3">{UTILITY_LABELS[invoice.utility_type] ?? invoice.utility_type}</td>
                    <td className="px-4 py-3">{invoice.invoice_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      {formatAmount(invoice.gross_amount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">{VALIDATION_LABELS[invoice.validation_status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
