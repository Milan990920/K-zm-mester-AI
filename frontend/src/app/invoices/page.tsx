"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  Invoice,
  InvoiceFilters,
  InvoiceSite,
  exportInvoices,
  fetchInvoiceSites,
  listInvoices,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UTILITY_LABELS } from "@/lib/utility-labels";
import { PageShell } from "@/components/layout/PageShell";
import { TopNav } from "@/components/layout/TopNav";

const INVOICE_TYPE_LABELS: Record<string, string> = {
  commercial: "Kereskedelmi",
  network_usage_fee: "Rendszerhasználati díj",
  capacity_fee: "Kapacitásdíj",
  partial: "Részszámla",
  settlement: "Elszámoló számla",
  storno: "Sztornó",
  correction: "Helyesbítő",
};

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

const VALIDATION_PILL_CLASS: Record<Invoice["validation_status"], string> = {
  pending: "pill-neutral",
  valid: "pill-good",
  invalid: "pill-bad",
  needs_review: "pill-warn",
};

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString("hu-HU")} ${currency}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { user, isLoading, logout, accessToken } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [sitesByInvoiceId, setSitesByInvoiceId] = useState<Record<string, InvoiceSite[]>>({});
  const [isSitesLoading, setIsSitesLoading] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>({});

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    setIsFetching(true);
    listInvoices(accessToken, filters)
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Ismeretlen hiba történt"))
      .finally(() => setIsFetching(false));
  }, [accessToken, filters]);

  function updateFilter(patch: Partial<InvoiceFilters>) {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      for (const key of Object.keys(next) as (keyof InvoiceFilters)[]) {
        if (!next[key]) delete next[key];
      }
      return next;
    });
  }

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
      const blob = await exportInvoices(accessToken, format, filters);
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
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Betöltés...</p>
      </main>
    );
  }

  return (
    <PageShell>
      <TopNav active="invoices" role={user.role} onLogout={logout} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Számlák</h1>
        {invoices.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => handleExport("xlsx")} disabled={isExporting} className="btn-secondary">
              Export Excel
            </button>
            <button onClick={() => handleExport("csv")} disabled={isExporting} className="btn-secondary">
              Export CSV
            </button>
          </div>
        )}
      </div>

      <div className="card mb-6 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <select
          value={filters.utility_type ?? ""}
          onChange={(e) => updateFilter({ utility_type: e.target.value || undefined })}
          className="field-select"
        >
          <option value="">Összes közmű</option>
          {Object.entries(UTILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.invoice_type ?? ""}
          onChange={(e) => updateFilter({ invoice_type: e.target.value || undefined })}
          className="field-select"
        >
          <option value="">Összes számlatípus</option>
          {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Számlaszám"
          value={filters.invoice_number ?? ""}
          onChange={(e) => updateFilter({ invoice_number: e.target.value || undefined })}
          className="field-input"
        />
        <input
          type="text"
          placeholder="POD"
          value={filters.pod ?? ""}
          onChange={(e) => updateFilter({ pod: e.target.value || undefined })}
          className="field-input"
        />
        <input
          type="date"
          aria-label="Időszak kezdete"
          value={filters.period_start ?? ""}
          onChange={(e) => updateFilter({ period_start: e.target.value || undefined })}
          className="field-input"
        />
        <input
          type="date"
          aria-label="Időszak vége"
          value={filters.period_end ?? ""}
          onChange={(e) => updateFilter({ period_end: e.target.value || undefined })}
          className="field-input"
        />
      </div>

      {isFetching && <p className="text-sm text-muted">Betöltés...</p>}
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">{error}</p>}

      {!isFetching && !error && invoices.length === 0 && (
        <p className="text-sm text-faint">
          {Object.keys(filters).length > 0
            ? "Nincs a szűrésnek megfelelő számla."
            : "Még nincs feltöltött számla."}
        </p>
      )}

      {invoices.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr>
                <th>Számlaszám</th>
                <th>Közmű</th>
                <th>Kelte</th>
                <th>Bruttó összeg</th>
                <th>Állapot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <Fragment key={invoice.id}>
                  <tr>
                    <td className="font-mono">
                      <Link href={`/invoices/${invoice.id}`} className="text-ink hover:text-accent">
                        {invoice.invoice_number ?? "—"}
                      </Link>
                    </td>
                    <td>{utilityTypeLabel(invoice)}</td>
                    <td className="font-mono tabular-nums">{invoice.invoice_date ?? "—"}</td>
                    <td className="font-mono tabular-nums">
                      {formatAmount(invoice.gross_amount, invoice.currency)}
                    </td>
                    <td>
                      <span className={VALIDATION_PILL_CLASS[invoice.validation_status]}>
                        {VALIDATION_LABELS[invoice.validation_status]}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => toggleSites(invoice.id)} className="text-xs text-muted hover:text-accent">
                        {expandedInvoiceId === invoice.id ? "Telephelyek elrejtése" : "Telephelyek"}
                      </button>
                    </td>
                  </tr>
                  {expandedInvoiceId === invoice.id && (
                    <tr>
                      <td colSpan={6} className="bg-bg">
                        {isSitesLoading && !sitesByInvoiceId[invoice.id] && (
                          <p className="text-xs text-faint">Betöltés...</p>
                        )}
                        {sitesByInvoiceId[invoice.id]?.length === 0 && (
                          <p className="text-xs text-faint">
                            Ehhez a számlához nincs telephely-szintű bontás — egyetlen fogyasztási helyre
                            vonatkozik.
                          </p>
                        )}
                        {sitesByInvoiceId[invoice.id] && sitesByInvoiceId[invoice.id].length > 0 && (
                          <table className="w-full text-xs">
                            <thead className="text-faint">
                              <tr>
                                <th className="px-2 py-1 text-left">Telephely</th>
                                <th className="px-2 py-1 text-left">Azonosító</th>
                                <th className="px-2 py-1 text-right">Fogyasztás</th>
                                <th className="px-2 py-1 text-right">Bruttó összeg</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sitesByInvoiceId[invoice.id].map((site) => (
                                <tr key={site.id} className="border-t border-border">
                                  <td className="px-2 py-1">{site.site_address}</td>
                                  <td className="px-2 py-1 font-mono">{site.site_identifier ?? "—"}</td>
                                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                                    {site.consumption_value ?? "—"} {site.consumption_unit ?? ""}
                                  </td>
                                  <td className="px-2 py-1 text-right font-mono tabular-nums">
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
    </PageShell>
  );
}
