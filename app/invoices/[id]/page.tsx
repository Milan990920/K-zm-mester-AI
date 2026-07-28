"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAmount, formatPeriod, formatQuantity } from "@/lib/format";
import { energyBadgeClass } from "@/lib/energyBadge";
import { INVOICE_TYPE_LABELS, PAYMENT_STATUS_BADGE_CLASSES, PAYMENT_STATUS_LABELS } from "@/lib/labels";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  providerName: string;
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  quantity: number;
  unit: string;
  meterSerialNumber: string | null;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  unitPrice: number | null;
  invoiceType: string;
  paymentStatus: string;
  attachmentPath: string | null;
  isDraft: boolean;
  customer: { id: string; name: string };
  site: { id: string; name: string; address: string };
  meteringPoint: { id: string; podCode: string };
  energyType: { code: string; name: string };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="field-label mb-0.5">{label}</p>
      <div className="font-mono text-[15px] text-ink">{children}</div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((res) => res.json())
      .then(setInvoice);
  }, [params.id]);

  if (!invoice) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted">Betöltés…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href={`/customers/${invoice.customer.id}`} className="link-quiet mb-8 inline-block text-sm text-muted">
        ← {invoice.customer.name}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{invoice.site.name}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {invoice.isDraft && <span className="badge bg-muted/10 text-muted">Piszkozat</span>}
          <span className={`badge ${PAYMENT_STATUS_BADGE_CLASSES[invoice.paymentStatus]}`}>
            {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
          </span>
          <span className={`badge ${energyBadgeClass(invoice.energyType.code)}`}>{invoice.energyType.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="surface flex flex-col gap-4 p-6">
          <Field label="Szolgáltató">{invoice.providerName}</Field>
          <Field label="Mérési pont (POD)">{invoice.meteringPoint.podCode}</Field>
          <Field label="Számlázási időszak">{formatPeriod(new Date(invoice.periodStart), new Date(invoice.periodEnd))}</Field>
          <Field label="Kiállítás dátuma">{invoice.issueDate.slice(0, 10)}</Field>
          {invoice.dueDate && <Field label="Fizetési határidő">{invoice.dueDate.slice(0, 10)}</Field>}
          <Field label="Fogyasztott mennyiség">{formatQuantity(invoice.quantity, invoice.unit)}</Field>
          {invoice.meterSerialNumber && (
            <Field label="Mérőóra gyári szám">{invoice.meterSerialNumber}</Field>
          )}
          <Field label="Számlatípus">{INVOICE_TYPE_LABELS[invoice.invoiceType]}</Field>
        </div>

        <div className="surface flex flex-col gap-4 p-6">
          <Field label="Nettó összeg">{formatAmount(invoice.netAmount, invoice.currency)}</Field>
          <Field label={`Áfa (${invoice.vatRate}%)`}>{formatAmount(invoice.vatAmount, invoice.currency)}</Field>
          <Field label="Bruttó összeg">{formatAmount(invoice.grossAmount, invoice.currency)}</Field>
          {invoice.unitPrice !== null && (
            <Field label="Egységár">
              {invoice.unitPrice} {invoice.currency}/{invoice.unit}
            </Field>
          )}
          {invoice.attachmentPath && (
            <div className="mt-2">
              <p className="field-label mb-2">Csatolt dokumentum</p>
              {invoice.attachmentPath.endsWith(".pdf") ? (
                <iframe
                  src={`/api/attachments/${invoice.attachmentPath}`}
                  className="h-[420px] w-full rounded-lg border border-border"
                  title="Számla PDF előnézet"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/attachments/${invoice.attachmentPath}`}
                  alt="Számla melléklet"
                  className="max-h-[420px] w-full rounded-lg border border-border object-contain"
                />
              )}
              <a
                href={`/api/attachments/${invoice.attachmentPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline mt-3 inline-flex"
              >
                Megnyitás új lapon
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
