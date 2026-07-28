"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatAmount, formatPeriod, formatQuantity } from "@/lib/format";
import { energyBadgeClass } from "@/lib/energyBadge";
import { PAYMENT_STATUS_BADGE_CLASSES, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { currentMonthRange, currentQuarterRange, currentYearRange } from "@/lib/dateRanges";

interface EnergyType {
  id: string;
  code: string;
  name: string;
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
  address: string;
  meteringPoints: MeteringPoint[];
}
interface CustomerDetail {
  id: string;
  name: string;
  sites: Site[];
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  quantity: number;
  unit: string;
  meterSerialNumber: string | null;
  netAmount: number;
  grossAmount: number;
  currency: string;
  paymentStatus: string;
  attachmentPath: string | null;
  isDraft: boolean;
  customer: { name: string };
  site: { name: string; address: string };
  meteringPoint: { podCode: string };
  energyType: { code: string; name: string };
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

function QuickRangeButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost !px-2.5 !py-1 text-xs">
      {label}
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);

  const siteIds = useMemo(() => searchParams.get("siteIds")?.split(",").filter(Boolean) ?? [], [searchParams]);
  const meteringPointId = searchParams.get("meteringPointId") ?? "";
  const energyTypeIds = useMemo(
    () => searchParams.get("energyTypeIds")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );
  const provider = searchParams.get("provider") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const periodFrom = searchParams.get("periodFrom") ?? "";
  const periodTo = searchParams.get("periodTo") ?? "";
  const q = searchParams.get("q") ?? "";

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.replace(`/customers/${params.id}/invoices?${next.toString()}`);
  }

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

  const allEnergyTypes = useMemo(() => {
    const map = new Map<string, EnergyType>();
    customer?.sites.forEach((site) =>
      site.meteringPoints.forEach((mp) => map.set(mp.energyType.id, mp.energyType)),
    );
    return Array.from(map.values());
  }, [customer]);

  const availableMeteringPoints = useMemo(() => {
    if (!customer) return [];
    const sites = siteIds.length > 0 ? customer.sites.filter((s) => siteIds.includes(s.id)) : customer.sites;
    return sites.flatMap((site) => site.meteringPoints.map((mp) => ({ ...mp, siteName: site.name })));
  }, [customer, siteIds]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    customer?.sites.forEach((site) =>
      site.meteringPoints.forEach((mp) => mp.providerName && set.add(mp.providerName)),
    );
    return Array.from(set);
  }, [customer]);

  function toggleSite(siteId: string) {
    const next = siteIds.includes(siteId) ? siteIds.filter((id) => id !== siteId) : [...siteIds, siteId];
    updateParams({ siteIds: next.join(","), meteringPointId: null });
  }

  function toggleEnergyType(id: string) {
    const next = energyTypeIds.includes(id) ? energyTypeIds.filter((e) => e !== id) : [...energyTypeIds, id];
    updateParams({ energyTypeIds: next.join(",") });
  }

  function clearFilters() {
    router.replace(`/customers/${params.id}/invoices`);
  }

  const hasActiveFilters =
    siteIds.length > 0 ||
    !!meteringPointId ||
    energyTypeIds.length > 0 ||
    !!provider ||
    !!paymentStatus ||
    !!periodFrom ||
    !!periodTo ||
    !!q;

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
        <Link href={`/invoices/new?customerId=${customer.id}`} className="btn-brass">
          + Új számla
        </Link>
      </div>

      <div className="surface mb-6 flex flex-col gap-5 p-5">
        {customer.sites.length > 0 && (
          <div>
            <p className="field-label mb-2">Fogyasztási hely</p>
            <div className="flex flex-wrap gap-2">
              {customer.sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => toggleSite(site.id)}
                  className={`badge border transition-colors ${
                    siteIds.includes(site.id)
                      ? "border-brass bg-brass/10 text-brass"
                      : "border-border bg-white text-muted hover:text-ink"
                  }`}
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="field-label">POD</label>
            <select
              value={meteringPointId}
              onChange={(e) => updateParams({ meteringPointId: e.target.value || null })}
              className="field-select font-mono text-[13px]"
            >
              <option value="">Összes</option>
              {availableMeteringPoints.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.podCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Szolgáltató</label>
            <select
              value={provider}
              onChange={(e) => updateParams({ provider: e.target.value || null })}
              className="field-select"
            >
              <option value="">Összes</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Fizetési státusz</label>
            <select
              value={paymentStatus}
              onChange={(e) => updateParams({ paymentStatus: e.target.value || null })}
              className="field-select"
            >
              <option value="">Összes</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Keresés</label>
            <input
              value={q}
              onChange={(e) => updateParams({ q: e.target.value || null })}
              placeholder="Számlaszám, POD, gyári szám…"
              className="field-input"
            />
          </div>
        </div>

        {allEnergyTypes.length > 0 && (
          <div>
            <p className="field-label mb-2">Energianem</p>
            <div className="flex flex-wrap gap-2">
              {allEnergyTypes.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => toggleEnergyType(et.id)}
                  className={`badge border transition-colors ${
                    energyTypeIds.includes(et.id)
                      ? `${energyBadgeClass(et.code)} border-transparent`
                      : "border-border bg-white text-muted hover:text-ink"
                  }`}
                >
                  {et.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="field-label !mb-0">Számlázási időszak</p>
            <div className="flex gap-1">
              <QuickRangeButton
                label="Aktuális hónap"
                onClick={() => {
                  const r = currentMonthRange();
                  updateParams({ periodFrom: r.from, periodTo: r.to });
                }}
              />
              <QuickRangeButton
                label="Negyedév"
                onClick={() => {
                  const r = currentQuarterRange();
                  updateParams({ periodFrom: r.from, periodTo: r.to });
                }}
              />
              <QuickRangeButton
                label="Év"
                onClick={() => {
                  const r = currentYearRange();
                  updateParams({ periodFrom: r.from, periodTo: r.to });
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => updateParams({ periodFrom: e.target.value || null })}
              className="field-input max-w-[170px]"
            />
            <span className="text-sm text-muted">–</span>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => updateParams({ periodTo: e.target.value || null })}
              className="field-input max-w-[170px]"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="btn-ghost self-start text-xs">
            Szűrők törlése
          </button>
        )}
      </div>

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
                    {invoice.site.name}
                    <p className="text-xs text-muted">{invoice.site.address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <CopyableCode value={invoice.meteringPoint.podCode} />
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
                    {formatQuantity(invoice.quantity, invoice.unit)}
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
