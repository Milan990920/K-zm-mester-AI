"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

export default function NewCustomerPage() {
  return (
    <Suspense fallback={null}>
      <NewCustomerForm />
    </Suspense>
  );
}

function NewCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [taxNumber, setTaxNumber] = useState(searchParams.get("taxNumber") ?? "");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, taxNumber, contactName, contactEmail, contactPhone }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrors(data.errors ?? {});
        return;
      }
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/" className="link-quiet mb-8 inline-block text-sm text-muted">
        ← Ügyfelek
      </Link>
      <p className="eyebrow mb-2">Új ügyfél</p>
      <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-ink">
        Ügyfél felvétele
      </h1>

      <form onSubmit={handleSubmit} className="surface flex flex-col gap-4 p-6">
        <div>
          <label className="field-label">Név *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="field-label">Adószám</label>
          <input
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            className="field-input font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Kapcsolattartó</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Telefon</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="field-input"
          />
          {errors.contactEmail && <p className="mt-1 text-xs text-danger">{errors.contactEmail[0]}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-brass mt-2">
          Ügyfél mentése
        </button>
      </form>
    </main>
  );
}
