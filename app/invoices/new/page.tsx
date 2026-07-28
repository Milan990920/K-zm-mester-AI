"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { INVOICE_TYPE_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { computeUnitPrice, computeVatAndGross } from "@/lib/calculations/pricing";

interface EnergyType {
  id: string;
  code: string;
  name: string;
  allowedUnits: string[];
}
interface MeteringPoint {
  id: string;
  podCode: string;
  providerName: string | null;
  energyType: EnergyType;
}
interface Site {
  id: string;
  name: string;
  meteringPoints: MeteringPoint[];
}
interface CustomerDetail {
  id: string;
  name: string;
  sites: Site[];
}
interface CustomerListItem {
  id: string;
  name: string;
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [siteId, setSiteId] = useState(searchParams.get("siteId") ?? "");
  const [meteringPointId, setMeteringPointId] = useState(searchParams.get("meteringPointId") ?? "");

  const [providerName, setProviderName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [meterSerialNumber, setMeterSerialNumber] = useState("");
  const [netAmount, setNetAmount] = useState("");
  const [vatRate, setVatRate] = useState("27");
  const [vatAmount, setVatAmount] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [invoiceType, setInvoiceType] = useState("SETTLEMENT");
  const [file, setFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<"draft" | "final" | null>(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then(setCustomers);
  }, []);

  useEffect(() => {
    if (!customerId) {
      setCustomerDetail(null);
      return;
    }
    fetch(`/api/customers/${customerId}`)
      .then((res) => res.json())
      .then(setCustomerDetail);
  }, [customerId]);

  const site = customerDetail?.sites.find((s) => s.id === siteId) ?? null;
  const meteringPoint = site?.meteringPoints.find((mp) => mp.id === meteringPointId) ?? null;

  useEffect(() => {
    if (meteringPoint?.providerName && !providerName) setProviderName(meteringPoint.providerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meteringPoint]);

  useEffect(() => {
    const net = Number(netAmount);
    const rate = Number(vatRate);
    if (netAmount && vatRate && !Number.isNaN(net) && !Number.isNaN(rate)) {
      const computed = computeVatAndGross(net, rate);
      setVatAmount(String(computed.vatAmount));
      setGrossAmount(String(computed.grossAmount));
    }
  }, [netAmount, vatRate]);

  const computedUnitPrice = useMemo(() => {
    const gross = Number(grossAmount);
    const qty = Number(quantity);
    if (!grossAmount || !quantity || Number.isNaN(gross) || Number.isNaN(qty)) return null;
    return computeUnitPrice(gross, qty);
  }, [grossAmount, quantity]);

  async function handleSubmit(isDraft: boolean) {
    setIsSubmitting(isDraft ? "draft" : "final");
    setErrors({});
    setWarnings([]);
    try {
      const formData = new FormData();
      const fields: Record<string, string> = {
        customerId,
        siteId,
        meteringPointId,
        energyTypeId: meteringPoint?.energyType.id ?? "",
        providerName,
        invoiceNumber,
        issueDate,
        periodStart,
        periodEnd,
        dueDate,
        quantity,
        unit,
        meterSerialNumber,
        netAmount,
        vatRate,
        vatAmount,
        grossAmount,
        currency,
        invoiceType,
        isDraft: String(isDraft),
      };
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      if (file) formData.set("file", file);

      const res = await fetch("/api/invoices", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? {});
        return;
      }
      if (data.warnings?.length) {
        setWarnings(data.warnings);
      }
      router.push(`/invoices/${data.invoice.id}`);
    } finally {
      setIsSubmitting(null);
    }
  }

  const firstError = (field: string) => errors[field]?.[0];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="link-quiet mb-8 inline-block text-sm text-muted">
        ← Ügyfelek
      </Link>
      <p className="eyebrow mb-2">Számla rögzítése</p>
      <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-ink">
        Számla kézi felvétele
      </h1>

      <div className="surface mb-5 p-6">
        <h2 className="section-heading">Hova tartozik a számla</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Ügyfél</label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setSiteId("");
                setMeteringPointId("");
              }}
              className="field-select"
            >
              <option value="">Válassz…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Fogyasztási hely</label>
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setMeteringPointId("");
              }}
              disabled={!customerDetail}
              className="field-select"
            >
              <option value="">Válassz…</option>
              {customerDetail?.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Mérési pont (POD)</label>
            <select
              value={meteringPointId}
              onChange={(e) => setMeteringPointId(e.target.value)}
              disabled={!site}
              className="field-select font-mono text-[13px]"
            >
              <option value="">Válassz…</option>
              {site?.meteringPoints.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.podCode}
                </option>
              ))}
            </select>
          </div>
        </div>
        {meteringPoint && (
          <p className="mt-3 text-xs text-muted">
            Energianem: <span className="text-ink">{meteringPoint.energyType.name}</span> — csak ehhez
            tartozó mértékegység adható meg.
          </p>
        )}
      </div>

      <div className="surface mb-5 flex flex-col gap-4 p-6">
        <h2 className="section-heading">Számla adatai</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Szolgáltató</label>
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="field-input" />
            {firstError("providerName") && <FieldError message={firstError("providerName")!} />}
          </div>
          <div>
            <label className="field-label">Számlaszám</label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="field-input font-mono"
            />
            {firstError("invoiceNumber") && <FieldError message={firstError("invoiceNumber")!} />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Kiállítás dátuma</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Időszak kezdete</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="field-input"
            />
            {firstError("periodStart") && <FieldError message={firstError("periodStart")!} />}
          </div>
          <div>
            <label className="field-label">Időszak vége</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="field-input" />
            {firstError("periodEnd") && <FieldError message={firstError("periodEnd")!} />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Fizetési határidő</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Mennyiség</label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="field-input font-mono"
            />
            {firstError("quantity") && <FieldError message={firstError("quantity")!} />}
          </div>
          <div>
            <label className="field-label">Mértékegység</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={!meteringPoint}
              className="field-select"
            >
              <option value="">Válassz…</option>
              {meteringPoint?.energyType.allowedUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {firstError("unit") && <FieldError message={firstError("unit")!} />}
          </div>
        </div>

        <div>
          <label className="field-label">Mérőóra gyári szám (a számlán szereplő)</label>
          <input
            value={meterSerialNumber}
            onChange={(e) => setMeterSerialNumber(e.target.value)}
            className="field-input font-mono"
          />
        </div>
      </div>

      <div className="surface mb-5 flex flex-col gap-4 p-6">
        <h2 className="section-heading">Összegek</h2>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="field-label">Nettó</label>
            <input
              type="number"
              step="any"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="field-label">Áfa (%)</label>
            <input
              type="number"
              step="any"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="field-label">Áfa összeg</label>
            <input
              type="number"
              step="any"
              value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="field-label">Bruttó *</label>
            <input
              type="number"
              step="any"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="field-input font-mono"
            />
            {firstError("grossAmount") && <FieldError message={firstError("grossAmount")!} />}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Pénznem</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="field-select">
              <option value="HUF">HUF</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="field-label">Számlatípus</label>
            <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="field-select">
              {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Számolt egységár</label>
            <p className="field-input flex items-center bg-bg font-mono text-muted">
              {computedUnitPrice !== null ? `${computedUnitPrice} ${currency}/${unit || "egység"}` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="surface mb-6 p-6">
        <h2 className="section-heading">Melléklet</h2>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-bg/60 px-6 py-8 text-center transition-colors hover:border-brass/50">
          <span className="text-sm font-medium text-ink">
            {file ? file.name : "Húzd ide a számla PDF-jét vagy képét, vagy kattints a tallózáshoz"}
          </span>
          <span className="text-xs text-muted">PDF, JPG vagy PNG, legfeljebb 15 MB</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {firstError("file") && <FieldError message={firstError("file")!} />}
      </div>

      {warnings.length > 0 && (
        <div className="surface mb-6 border-brass/40 bg-brass/5 p-4">
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-brass">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => handleSubmit(true)} disabled={isSubmitting !== null} className="btn-outline">
          Piszkozatként mentés
        </button>
        <button onClick={() => handleSubmit(false)} disabled={isSubmitting !== null} className="btn-brass">
          Végleges mentés
        </button>
      </div>
    </main>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}
