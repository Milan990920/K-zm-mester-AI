"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ApiError,
  InvoiceDetail,
  InvoiceSite,
  fetchDocumentPdf,
  fetchInvoiceDetail,
  fetchInvoiceSites,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UTILITY_LABELS } from "@/lib/utility-labels";
import { PageShell } from "@/components/layout/PageShell";

const INVOICE_TYPE_LABELS: Record<string, string> = {
  commercial: "Kereskedelmi",
  network_usage_fee: "Rendszerhasználati díj",
  capacity_fee: "Kapacitásdíj",
  partial: "Részszámla",
  settlement: "Elszámoló számla",
  storno: "Sztornó",
  correction: "Helyesbítő",
};

const VALIDATION_LABELS: Record<string, string> = {
  pending: "Feldolgozás alatt",
  valid: "Rendben",
  invalid: "Hibás",
  needs_review: "Ellenőrzés szükséges",
};

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString("hu-HU")} ${currency}`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="field-label mb-0.5">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading, accessToken } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [sites, setSites] = useState<InvoiceSite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    setIsFetching(true);
    Promise.all([
      fetchInvoiceDetail(accessToken, params.id),
      fetchInvoiceSites(accessToken, params.id),
    ])
      .then(([detail, siteList]) => {
        setInvoice(detail);
        setSites(siteList);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Ismeretlen hiba történt"))
      .finally(() => setIsFetching(false));
  }, [accessToken, params.id]);

  async function handleDownloadPdf() {
    if (!accessToken || !invoice) return;
    setIsDownloading(true);
    try {
      const blob = await fetchDocumentPdf(accessToken, invoice.document_id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A PDF letöltése sikertelen volt");
    } finally {
      setIsDownloading(false);
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
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Számla részletei</h1>
        <Link href="/invoices" className="text-sm text-muted hover:text-accent">
          Vissza a számlákhoz
        </Link>
      </header>

      {isFetching && <p className="text-sm text-muted">Betöltés...</p>}
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">{error}</p>}

      {invoice && (
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-lg font-semibold tracking-tight text-ink">
                {invoice.invoice_number ?? "Számlaszám nélkül"}
              </h2>
              <button onClick={handleDownloadPdf} disabled={isDownloading} className="btn-secondary">
                Eredeti PDF megnyitása
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field
                label="Közmű"
                value={
                  (UTILITY_LABELS[invoice.utility_type] ?? invoice.utility_type) +
                  (invoice.secondary_utility_types.length > 0
                    ? ` + ${invoice.secondary_utility_types.map((t) => UTILITY_LABELS[t] ?? t).join(", ")}`
                    : "")
                }
              />
              <Field
                label="Számlatípus"
                value={INVOICE_TYPE_LABELS[invoice.invoice_type] ?? invoice.invoice_type}
              />
              <Field label="Állapot" value={VALIDATION_LABELS[invoice.validation_status]} />
              <Field label="Számla kelte" value={invoice.invoice_date} />
              <Field label="Fizetési határidő" value={invoice.due_date} />
              <Field
                label="Elszámolási időszak"
                value={
                  invoice.billing_period_start && invoice.billing_period_end
                    ? `${invoice.billing_period_start} – ${invoice.billing_period_end}`
                    : null
                }
              />
              <Field label="POD" value={invoice.pod} />
              <Field label="Nettó összeg" value={formatAmount(invoice.net_amount, invoice.currency)} />
              <Field label="ÁFA" value={formatAmount(invoice.vat_amount, invoice.currency)} />
              <Field
                label="Bruttó összeg"
                value={formatAmount(invoice.gross_amount, invoice.currency)}
              />
              <Field
                label="Fizetendő összeg"
                value={formatAmount(invoice.amount_due, invoice.currency)}
              />
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="section-title">Számlatételek</h2>
            {invoice.line_items.length === 0 && (
              <p className="text-sm text-faint">Nincsenek rögzített tételsorok.</p>
            )}
            {invoice.line_items.length > 0 && (
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Megnevezés</th>
                    <th className="text-right">Mennyiség</th>
                    <th className="text-right">Nettó</th>
                    <th className="text-right">ÁFA</th>
                    <th className="text-right">Bruttó</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td className="text-right font-mono tabular-nums">
                        {item.quantity ?? "—"} {item.unit ?? ""}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {formatAmount(item.net_value, invoice.currency)}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {formatAmount(item.vat_value, invoice.currency)}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {formatAmount(item.gross_value, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {sites.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title">Telephelyek ({sites.length})</h2>
              <table className="app-table text-xs">
                <thead>
                  <tr>
                    <th>Telephely</th>
                    <th>Azonosító</th>
                    <th className="text-right">Fogyasztás</th>
                    <th className="text-right">Bruttó összeg</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td>{site.site_address}</td>
                      <td className="font-mono">{site.site_identifier ?? "—"}</td>
                      <td className="text-right font-mono tabular-nums">
                        {site.consumption_value ?? "—"} {site.consumption_unit ?? ""}
                      </td>
                      <td className="text-right font-mono tabular-nums">
                        {formatAmount(site.gross_amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
