"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatAmount, formatPeriod, formatQuantity } from "@/lib/format";
import { energyBadgeClass } from "@/lib/energyBadge";
import { PAYMENT_STATUS_BADGE_CLASSES, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { InvoiceFilterBar } from "@/components/InvoiceFilterBar";
import type { CustomerDetail } from "@/lib/types";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  quantity: number;
  meterSerialNumber: string | null;
  netAmount: number;
  grossAmount: number;
  currency: string;
  paymentStatus: string;
  attachmentPath: string | null;
  isDraft: boolean;
  customer: { name: string };
  consumptionSite: { name: string; address: string | null };
  measurementPoint: { podCode: string };
  energyType: { code: string; name: string };
  unit: { name: string };
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Vágólap-hozzáférés nélkül (pl. http kontextus) csendben nem csinálunk semmit.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Kattints a másoláshoz"
      className="group inline-flex items-center gap-1.5 font-mono text-[13px] text-ink hover:text-brass"
    >
      {value}
      <span className="text-muted/50 group-hover:text-brass">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

export default function CustomerInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoiceListView />
    </Suspense>
  );
}

function InvoiceListView() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((res) => res.json())
      .then(setCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("customerId", params.id);
    setInvoices(null);
    fetch(`/api/invoices?${query.toString()}`)
      .then((res) => res.json())
      .then(setInvoices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, searchParams]);

  const hasActiveFilters = Array.from(searchParams.keys()).length > 0;

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
          <p className="eyebrow mb-2">Számlák</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{customer.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer.id}/dashboard?${searchParams.toString()}`} className="btn-outline">
            Dashboard
          </Link>
          <Link href={`/invoices/new?customerId=${customer.id}`} className="btn-brass">
            + Új számla
          </Link>
        </div>
      </div>

      <InvoiceFilterBar customer={customer} />

      {invoices === null && <p className="text-sm text-muted">Betöltés…</p>}

      {invoices !== null && invoices.length === 0 && (
        <div className="empty-state">
          <p className="font-display text-base font-medium text-ink">
            {hasActiveFilters ? "Nincs a szűrésnek megfelelő számla" : "Ehhez az ügyfélhez még nincs számla rögzítve"}
          </p>
          <p className="max-w-sm text-sm text-muted">
            {hasActiveFilters
              ? "Próbálj tágabb időszakot vagy kevesebb szűrőfeltételt beállítani."
              : "Rögzíts egyet manuálisan, vagy tölts fel egy PDF számlát a mérési pontnál."}
          </p>
        </div>
      )}

      {invoices !== null && invoices.length > 0 && (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-3 font-semibold">Ügyfél</th>
                <th className="px-4 py-3 font-semibold">Fogyasztási hely</th>
                <th className="px-4 py-3 font-semibold">POD</th>
                <th className="px-4 py-3 font-semibold">Gyári szám</th>
                <th className="px-4 py-3 font-semibold">Szolgáltató</th>
                <th className="px-4 py-3 font-semibold">Energianem</th>
                <th className="px-4 py-3 font-semibold">Időszak</th>
                <th className="px-4 py-3 font-semibold">Mennyiség</th>
                <th className="px-4 py-3 font-semibold">Nettó / Bruttó</th>
                <th className="px-4 py-3 font-semibold">Státusz</th>
                <th className="px-4 py-3 font-semibold">Melléklet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-bg/60">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${invoice.id}`} className="link-quiet">
                      {invoice.customer.name}
                    </Link>
                    {invoice.isDraft && <span className="badge ml-2 bg-muted/10 text-muted">Piszkozat</span>}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {invoice.consumptionSite.name}
                    {invoice.consumptionSite.address && (
                      <p className="text-xs text-muted">{invoice.consumptionSite.address}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CopyableCode value={invoice.measurementPoint.podCode} />
                  </td>
                  <td className="px-4 py-3">
                    {invoice.meterSerialNumber ? (
                      <CopyableCode value={invoice.meterSerialNumber} />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{invoice.providerName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${energyBadgeClass(invoice.energyType.code)}`}>
                      {invoice.energyType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                    {formatPeriod(new Date(invoice.periodStart), new Date(invoice.periodEnd))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                    {formatQuantity(invoice.quantity, invoice.unit.name)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-[13px]">
                    <span className="text-muted">{formatAmount(invoice.netAmount, invoice.currency)}</span>
                    <span className="mx-1 text-muted">/</span>
                    <span className="font-semibold text-ink">
                      {formatAmount(invoice.grossAmount, invoice.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${PAYMENT_STATUS_BADGE_CLASSES[invoice.paymentStatus]}`}>
                      {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {invoice.attachmentPath ? (
                      <a
                        href={`/api/attachments/${invoice.attachmentPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Melléklet megnyitása"
                        className="text-lg text-brass hover:text-ink"
                      >
                        📎
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
