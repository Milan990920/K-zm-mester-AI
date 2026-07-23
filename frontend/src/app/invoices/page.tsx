"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  Invoice,
  InvoiceSite,
  exportInvoices,
  fetchInvoiceSites,
  listInvoices,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UTILITY_LABELS } from "@/lib/utility-labels";

function utilityTypeLabel(invoice: Invoice): string {
  const primary = UTILITY_LABELS[invoice.utility_type] ?? invoice.utility_type;
  if (invoice.secondary_utility_types.length === 0) return primary;
  const secondary = invoice.secondary_utility_types
    .map((type) => UTILITY_LABELS[type] ?? type)
    .join(", ");
  return `${primary} + ${secondary}`;
}

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
  const [isExporting, setIsExporting] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [sitesByInvoiceId, setSitesByInvoiceId] = useState<Record<string, InvoiceSite[]>>({});
  const [isSitesLoading, setIsSitesLoading] = useState(false);

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

  async function toggleSites(invoiceId: string) {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      return;
    }
    setExpandedInvoiceId(invoiceId);
    if (!accessToken || sitesByInvoiceId[invoiceId]) return;
    setIsSitesLoading(true);
    try {
      const sites = await fetchInvoiceSites(accessToken, invoiceId);
      setSitesByInvoiceId((prev) => ({ ...prev, [invoiceId]: sites }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A telephely-bontás lekérése sikertelen volt");
    } finally {
      setIsSitesLoading(false);
    }
  }

  async function handleExport(format: "csv" | "xlsx") {
    if (!accessToken) return;
    setIsExporting(true);
    try {
      const blob = await exportInvoices(accessToken, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `szamlak.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Az exportálás sikertelen volt");
    } finally {
      setIsExporting(false);
    }
  }

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
          <div className="flex items-center gap-3">
            {invoices.length > 0 && (
              <>
                <button
                  onClick={() => handleExport("xlsx")}
                  disabled={isExporting}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  disabled={isExporting}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </>
            )}
            <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
              Vissza a dashboardra
            </Link>
          </div>
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <Fragment key={invoice.id}>
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">{invoice.invoice_number ?? "—"}</td>
                      <td className="px-4 py-3">{utilityTypeLabel(invoice)}</td>
                      <td className="px-4 py-3">{invoice.invoice_date ?? "—"}</td>
                      <td className="px-4 py-3">
                        {formatAmount(invoice.gross_amount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">{VALIDATION_LABELS[invoice.validation_status]}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSites(invoice.id)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          {expandedInvoiceId === invoice.id ? "Telephelyek elrejtése" : "Telephelyek"}
                        </button>
                      </td>
                    </tr>
                    {expandedInvoiceId === invoice.id && (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={6} className="px-4 py-3">
                          {isSitesLoading && !sitesByInvoiceId[invoice.id] && (
                            <p className="text-xs text-slate-400">Betöltés...</p>
                          )}
                          {sitesByInvoiceId[invoice.id]?.length === 0 && (
                            <p className="text-xs text-slate-400">
                              Ehhez a számlához nincs telephely-szintű bontás — egyetlen fogyasztási helyre
                              vonatkozik.
                            </p>
                          )}
                          {sitesByInvoiceId[invoice.id] && sitesByInvoiceId[invoice.id].length > 0 && (
                            <table className="w-full text-xs">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="px-2 py-1 text-left">Telephely</th>
                                  <th className="px-2 py-1 text-left">Azonosító</th>
                                  <th className="px-2 py-1 text-right">Fogyasztás</th>
                                  <th className="px-2 py-1 text-right">Bruttó összeg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sitesByInvoiceId[invoice.id].map((site) => (
                                  <tr key={site.id} className="border-t border-slate-200">
                                    <td className="px-2 py-1">{site.site_address}</td>
                                    <td className="px-2 py-1">{site.site_identifier ?? "—"}</td>
                                    <td className="px-2 py-1 text-right">
                                      {site.consumption_value ?? "—"} {site.consumption_unit ?? ""}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      {formatAmount(site.gross_amount, invoice.currency)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
