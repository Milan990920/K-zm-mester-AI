"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CustomerListItem {
  id: string;
  name: string;
  taxNumber: string | null;
  _count: { sites: number; invoices: number };
}

export default function CustomerSelectorPage() {
  const [customers, setCustomers] = useState<CustomerListItem[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then(setCustomers)
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const isEmpty = customers !== null && customers.length === 0 && query === "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Ügyfélválasztó</p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
            Ügyfelek
          </h1>
        </div>
        <Link href="/customers/new" className="btn-brass shrink-0">
          + Új ügyfél
        </Link>
      </div>

      {!isEmpty && (
        <div className="relative mb-6">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Keresés név vagy adószám alapján…"
            className="field-input pl-10"
          />
        </div>
      )}

      {customers === null && <p className="text-sm text-muted">Betöltés…</p>}

      {isEmpty && (
        <div className="empty-state">
          <p className="font-display text-lg font-medium text-ink">Még nincs egyetlen ügyfél sem</p>
          <p className="max-w-sm text-sm text-muted">
            Kezdd az első ügyfél felvételével — utána tudsz hozzá fogyasztási helyet és mérési pontot
            (POD-ot) rögzíteni, majd számlákat feltölteni.
          </p>
          <Link href="/customers/new" className="btn-brass mt-3">
            + Új ügyfél felvétele
          </Link>
        </div>
      )}

      {customers !== null && customers.length === 0 && query !== "" && (
        <p className="surface px-5 py-6 text-sm text-muted">
          Nincs a keresésnek megfelelő ügyfél (&bdquo;{query}&rdquo;).
        </p>
      )}

      {customers !== null && customers.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="surface group flex items-center justify-between px-5 py-4 transition-transform hover:-translate-y-px hover:border-brass/40"
              >
                <div>
                  <p className="font-display text-[16px] font-medium tracking-tight text-ink">
                    {customer.name}
                  </p>
                  {customer.taxNumber && (
                    <p className="mt-0.5 font-mono text-xs text-muted">{customer.taxNumber}</p>
                  )}
                </div>
                <div className="flex items-center gap-5 text-xs text-muted">
                  <span>
                    <span className="font-mono text-[13px] text-ink">{customer._count.sites}</span>{" "}
                    fogyasztási hely
                  </span>
                  <span>
                    <span className="font-mono text-[13px] text-ink">{customer._count.invoices}</span>{" "}
                    számla
                  </span>
                  <span className="text-brass opacity-0 transition-opacity group-hover:opacity-100">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
