"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  partner: "Partner",
  customer_admin: "Ügyfél adminisztrátor",
  customer_user: "Ügyfél felhasználó",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Közmű Mester</h1>
            <p className="text-sm text-slate-500">
              Bejelentkezve mint {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Kijelentkezés
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard title="Havi fogyasztás" placeholder="Grafikon hamarosan" />
          <DashboardCard title="Havi költség" placeholder="Grafikon hamarosan" />
          <DashboardCard title="Éves költség" placeholder="Grafikon hamarosan" />
          <DashboardCard title="Legutóbb feltöltött számlák" placeholder="Még nincs feltöltött számla" />
          <DashboardCard title="Feldolgozásra váró számlák" placeholder="Nincs feldolgozásra váró számla" />
          <DashboardCard title="AI asszisztens" placeholder="Hamarosan elérhető" />
        </div>
      </div>
    </main>
  );
}

function DashboardCard({ title, placeholder }: { title: string; placeholder: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-slate-700">{title}</h2>
      <p className="text-sm text-slate-400">{placeholder}</p>
    </div>
  );
}
