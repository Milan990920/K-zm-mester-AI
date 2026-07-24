"use client";

import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  partner: "Partner",
  customer_admin: "Ügyfél adminisztrátor",
  customer_user: "Ügyfél felhasználó",
};

type NavKey = "dashboard" | "invoices" | "upload" | "users";

const NAV_ITEMS: { key: NavKey; href: string; label: string; adminOnly?: boolean }[] = [
  { key: "upload", href: "/upload", label: "Számla feltöltése" },
  { key: "invoices", href: "/invoices", label: "Számlák" },
  { key: "users", href: "/users", label: "Felhasználók", adminOnly: true },
];

export function TopNav({
  active,
  role,
  onLogout,
}: {
  active: NavKey;
  role: string;
  onLogout: () => void;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-accent">
            KM
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">Közmű Mester</span>
        </Link>
        <p className="mt-1 text-sm text-muted">Bejelentkezve mint {ROLE_LABELS[role] ?? role}</p>
      </div>
      <nav className="flex flex-wrap items-center gap-2">
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === "customer_admin").map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? "btn-primary" : "btn-secondary"}
          >
            {item.label}
          </Link>
        ))}
        <button onClick={onLogout} className="btn-ghost">
          Kijelentkezés
        </button>
      </nav>
    </header>
  );
}
