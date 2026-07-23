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
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Számla részletei</h1>
          <Link href="/invoices" className="text-sm text-slate-500 hover:underline">
            Vissza a számlákhoz
          </Link>
        </header>

        {isFetching && <p className="text-sm text-slate-500">Betöltés...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {invoice && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-slate-900">
                  {invoice.invoice_number ?? "Számlaszám nélkül"}
                </h2>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
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

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-slate-700">Számlatételek</h2>
              {invoice.line_items.length === 0 && (
                <p className="text-sm text-slate-400">Nincsenek rögzített tételsorok.</p>
              )}
              {invoice.line_items.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-2">Megnevezés</th>
                      <th className="py-2 pr-2 text-right">Mennyiség</th>
                      <th className="py-2 pr-2 text-right">Nettó</th>
                      <th className="py-2 pr-2 text-right">ÁFA</th>
                      <th className="py-2 text-right">Bruttó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2">{item.description}</td>
                        <td className="py-2 pr-2 text-right">
                          {item.quantity ?? "—"} {item.unit ?? ""}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatAmount(item.net_value, invoice.currency)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatAmount(item.vat_value, invoice.currency)}
                        </td>
                        <td className="py-2 text-right">
                          {formatAmount(item.gross_value, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {sites.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-medium text-slate-700">
                  Telephelyek ({sites.length})
                </h2>
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="px-2 py-1 text-left">Telephely</th>
                      <th className="px-2 py-1 text-left">Azonosító</th>
                      <th className="px-2 py-1 text-right">Fogyasztás</th>
                      <th className="px-2 py-1 text-right">Bruttó összeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
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
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
