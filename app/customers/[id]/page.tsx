"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { energyBadgeClass } from "@/lib/energyBadge";
import { MEASUREMENT_POINT_STATUS_LABELS, MEASUREMENT_TYPE_LABELS, SITE_CATEGORY_LABELS } from "@/lib/labels";

function firstFieldError(errors: Record<string, string[]> | undefined): string | undefined {
  if (!errors) return undefined;
  return Object.values(errors)[0]?.[0];
}

interface EnergyType {
  id: string;
  code: string;
  name: string;
}

interface MeasurementPoint {
  id: string;
  podCode: string;
  providerName: string | null;
  networkOperatorName: string | null;
  meterSerialNumber: string | null;
  measurementType: string;
  status: string;
  energyType: EnergyType;
}

interface ConsumptionSite {
  id: string;
  name: string;
  address: string | null;
  category: string;
  measurementPoints: MeasurementPoint[];
}

interface CustomerDetail {
  id: string;
  name: string;
  taxNumber: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  specialistName: string | null;
  specialistQualification: string | null;
  certificateIssuer: string | null;
  certificateNumber: string | null;
  serviceCompanyName: string | null;
  consumptionSites: ConsumptionSite[];
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [energyTypes, setEnergyTypes] = useState<EnergyType[]>([]);
  const [addingSite, setAddingSite] = useState(false);
  const [addingPodForSite, setAddingPodForSite] = useState<string | null>(null);

  async function reload() {
    const res = await fetch(`/api/customers/${params.id}`);
    if (res.ok) setCustomer(await res.json());
  }

  useEffect(() => {
    reload();
    fetch("/api/energy-types")
      .then((res) => res.json())
      .then(setEnergyTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!customer) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted">Betöltés…</p>
      </main>
    );
  }

  const hasSpecialistData = customer.specialistName || customer.serviceCompanyName;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="link-quiet mb-8 inline-block text-sm text-muted">
        ← Ügyfelek
      </Link>

      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Ügyfél</p>
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">
            {customer.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {customer.taxNumber && <span className="font-mono">{customer.taxNumber}</span>}
            {customer.contactName && <span>{customer.contactName}</span>}
            {customer.contactEmail && <span>{customer.contactEmail}</span>}
            {customer.contactPhone && <span>{customer.contactPhone}</span>}
          </div>
          {hasSpecialistData && (
            <p className="mt-2 text-xs text-muted">
              Szakreferens: <span className="text-ink">{customer.specialistName ?? "—"}</span>
              {customer.specialistQualification && ` (${customer.specialistQualification})`}
              {customer.serviceCompanyName && ` — ${customer.serviceCompanyName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer.id}/invoices`} className="btn-outline">
            Számlák megtekintése
          </Link>
          <Link href={`/customers/${customer.id}/dashboard`} className="btn-outline">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
          Fogyasztási helyek
        </h2>
        <button onClick={() => setAddingSite((v) => !v)} className="btn-outline">
          {addingSite ? "Mégse" : "+ Fogyasztási hely"}
        </button>
      </div>

      {addingSite && (
        <NewSiteForm
          customerId={customer.id}
          onDone={() => {
            setAddingSite(false);
            reload();
          }}
        />
      )}

      {customer.consumptionSites.length === 0 && !addingSite && (
        <div className="empty-state">
          <p className="font-display text-base font-medium text-ink">
            Ehhez az ügyfélhez még nincs fogyasztási hely rögzítve
          </p>
          <p className="max-w-sm text-sm text-muted">
            Vegyél fel egyet — utána tudsz hozzá mérési pontot (POD-ot) és számlát rögzíteni.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {customer.consumptionSites.map((site) => (
          <div key={site.id} className="surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-[15px] font-medium tracking-tight text-ink">{site.name}</p>
                  <span className="badge bg-muted/10 text-muted">{SITE_CATEGORY_LABELS[site.category]}</span>
                </div>
                {site.address && <p className="text-sm text-muted">{site.address}</p>}
              </div>
              <button
                onClick={() => setAddingPodForSite((v) => (v === site.id ? null : site.id))}
                className="btn-ghost text-xs"
              >
                {addingPodForSite === site.id ? "Mégse" : "+ Mérési pont"}
              </button>
            </div>

            {addingPodForSite === site.id && (
              <NewMeasurementPointForm
                consumptionSiteId={site.id}
                energyTypes={energyTypes}
                onDone={() => {
                  setAddingPodForSite(null);
                  reload();
                }}
              />
            )}

            {site.measurementPoints.length === 0 && addingPodForSite !== site.id && (
              <p className="text-xs italic text-muted">Ehhez a fogyasztási helyhez még nincs mérési pont.</p>
            )}

            {site.measurementPoints.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {site.measurementPoints.map((mp) => (
                  <li key={mp.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="font-mono text-[13px] text-ink">{mp.podCode}</span>
                    <span className={`badge ${energyBadgeClass(mp.energyType.code)}`}>
                      {mp.energyType.name}
                    </span>
                    <span className="badge bg-muted/10 text-muted">{MEASUREMENT_TYPE_LABELS[mp.measurementType]}</span>
                    <span className="ml-auto text-xs text-muted">{mp.providerName ?? "—"}</span>
                    {mp.status === "INACTIVE" && (
                      <span className="badge bg-muted/10 text-muted">{MEASUREMENT_POINT_STATUS_LABELS.INACTIVE}</span>
                    )}
                    <Link
                      href={`/invoices/new?customerId=${customer.id}&consumptionSiteId=${site.id}&measurementPointId=${mp.id}`}
                      className="text-xs font-semibold text-brass hover:underline"
                    >
                      + Számla
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function NewSiteForm({ customerId, onDone }: { customerId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("BUILDING");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consumption-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name, address, category }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(firstFieldError(data.errors) ?? "A mentés sikertelen volt.");
        return;
      }
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface mb-4 flex flex-col gap-3 p-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Megnevezés</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Cím</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Kategória</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-select">
            {Object.entries(SITE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-brass self-start">
        Fogyasztási hely mentése
      </button>
    </form>
  );
}

function NewMeasurementPointForm({
  consumptionSiteId,
  energyTypes,
  onDone,
}: {
  consumptionSiteId: string;
  energyTypes: EnergyType[];
  onDone: () => void;
}) {
  const [podCode, setPodCode] = useState("");
  const [energyTypeId, setEnergyTypeId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [measurementType, setMeasurementType] = useState("PROFILE");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/measurement-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumptionSiteId, podCode, energyTypeId, providerName, measurementType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(firstFieldError(data.errors) ?? "A mentés sikertelen volt.");
        return;
      }
      if (data.warning) {
        setWarning(data.warning);
        setTimeout(onDone, 1400);
        return;
      }
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="field-label">POD-kód</label>
          <input
            value={podCode}
            onChange={(e) => setPodCode(e.target.value)}
            className="field-input font-mono"
          />
        </div>
        <div>
          <label className="field-label">Energianem</label>
          <select
            value={energyTypeId}
            onChange={(e) => setEnergyTypeId(e.target.value)}
            className="field-select"
          >
            <option value="">Válassz…</option>
            {energyTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Mérés típusa</label>
          <select value={measurementType} onChange={(e) => setMeasurementType(e.target.value)} className="field-select">
            {Object.entries(MEASUREMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Szolgáltató</label>
          <input
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className="field-input"
          />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {warning && <p className="text-xs text-brass">{warning}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-brass self-start">
        Mérési pont mentése
      </button>
    </form>
  );
}
