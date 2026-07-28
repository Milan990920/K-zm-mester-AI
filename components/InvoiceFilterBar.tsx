"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { energyBadgeClass } from "@/lib/energyBadge";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { currentMonthRange, currentQuarterRange, currentYearRange } from "@/lib/dateRanges";
import type { CustomerDetail, EnergyType } from "@/lib/types";

function QuickRangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost !px-2.5 !py-1 text-xs">
      {label}
    </button>
  );
}

// SPEC.md 5.2 — "Fogyasztási hely → POD → energianem szerint szűkíthető
// almenü/szűrő, ebben a sorrendben." Ugyanez a szűrősáv szolgálja ki a
// számlalistát és a dashboardot is (5.4: "ugyanazok a szűrők"), a szűrőállapot
// mindkét oldalon az aktuális útvonal query-stringjében él.
export function InvoiceFilterBar({ customer }: { customer: CustomerDetail }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    router.replace(`${pathname}?${next.toString()}`);
  }

  const allEnergyTypes = useMemo(() => {
    const map = new Map<string, EnergyType>();
    customer.sites.forEach((site) => site.meteringPoints.forEach((mp) => map.set(mp.energyType.id, mp.energyType)));
    return Array.from(map.values());
  }, [customer]);

  const availableMeteringPoints = useMemo(() => {
    const sites = siteIds.length > 0 ? customer.sites.filter((s) => siteIds.includes(s.id)) : customer.sites;
    return sites.flatMap((site) => site.meteringPoints.map((mp) => ({ ...mp, siteName: site.name })));
  }, [customer, siteIds]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    customer.sites.forEach((site) => site.meteringPoints.forEach((mp) => mp.providerName && set.add(mp.providerName)));
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
    router.replace(pathname);
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

  return (
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
  );
}
