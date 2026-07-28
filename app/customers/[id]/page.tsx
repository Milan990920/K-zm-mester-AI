"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { energyBadgeClass } from "@/lib/energyBadge";

function firstFieldError(errors: Record<string, string[]> | undefined): string | undefined {
  if (!errors) return undefined;
  return Object.values(errors)[0]?.[0];
}

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
  networkOperatorName: string | null;
  currentMeterSerial: string | null;
  isActive: boolean;
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
  taxNumber: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sites: Site[];
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
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-muted">Betöltés…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
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

      {customer.sites.length === 0 && !addingSite && (
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
        {customer.sites.map((site) => (
          <div key={site.id} className="surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-display text-[15px] font-medium tracking-tight text-ink">{site.name}</p>
                <p className="text-sm text-muted">{site.address}</p>
              </div>
              <button
                onClick={() => setAddingPodForSite((v) => (v === site.id ? null : site.id))}
                className="btn-ghost text-xs"
              >
                {addingPodForSite === site.id ? "Mégse" : "+ Mérési pont"}
              </button>
            </div>

            {addingPodForSite === site.id && (
              <NewMeteringPointForm
                siteId={site.id}
                energyTypes={energyTypes}
                onDone={() => {
                  setAddingPodForSite(null);
                  reload();
                }}
              />
            )}

            {site.meteringPoints.length === 0 && addingPodForSite !== site.id && (
              <p className="text-xs italic text-muted">Ehhez a fogyasztási helyhez még nincs mérési pont.</p>
            )}

            {site.meteringPoints.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {site.meteringPoints.map((mp) => (
                  <li key={mp.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="font-mono text-[13px] text-ink">{mp.podCode}</span>
                    <span className={`badge ${energyBadgeClass(mp.energyType.code)}`}>
                      {mp.energyType.name}
                    </span>
                    <span className="ml-auto text-xs text-muted">{mp.providerName ?? "—"}</span>
                    {!mp.isActive && <span className="badge bg-muted/10 text-muted">Inaktív</span>}
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name, address }),
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Megnevezés</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Cím</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="field-input" />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="btn-brass self-start">
        Fogyasztási hely mentése
      </button>
    </form>
  );
}

function NewMeteringPointForm({
  siteId,
  energyTypes,
  onDone,
}: {
  siteId: string;
  energyTypes: EnergyType[];
  onDone: () => void;
}) {
  const [podCode, setPodCode] = useState("");
  const [energyTypeId, setEnergyTypeId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/metering-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, podCode, energyTypeId, providerName }),
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
      <div className="grid grid-cols-3 gap-3">
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
