"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, ManagedUser, createUser, listUsers, setUserActive } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABELS: Record<ManagedUser["role"], string> = {
  customer_admin: "Ügyfél adminisztrátor",
  customer_user: "Ügyfél felhasználó",
};

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading, accessToken } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ManagedUser["role"]>("customer_user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && user && user.role !== "customer_admin") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  function loadUsers() {
    if (!accessToken) return;
    setIsFetching(true);
    listUsers(accessToken)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Ismeretlen hiba történt"))
      .finally(() => setIsFetching(false));
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createUser(accessToken, { email, full_name: fullName, password, role });
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("customer_user");
      loadUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "A meghívás sikertelen volt");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(target: ManagedUser) {
    if (!accessToken) return;
    try {
      await setUserActive(accessToken, target.id, !target.is_active);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A módosítás sikertelen volt");
    }
  }

  if (isLoading || !user || user.role !== "customer_admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Felhasználók</h1>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
            Vissza a dashboardra
          </Link>
        </header>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-slate-700">Új felhasználó meghívása</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              placeholder="Teljes név"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              required
              placeholder="Email cím"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Jelszó (min. 8 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ManagedUser["role"])}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="customer_user">Ügyfél felhasználó</option>
              <option value="customer_admin">Ügyfél adminisztrátor</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-2"
            >
              Meghívás
            </button>
            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}
          </form>
        </div>

        {isFetching && <p className="text-sm text-slate-500">Betöltés...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isFetching && !error && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Név</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Szerepkör</th>
                  <th className="px-4 py-3">Állapot</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((managedUser) => (
                  <tr key={managedUser.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{managedUser.full_name}</td>
                    <td className="px-4 py-3">{managedUser.email}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[managedUser.role]}</td>
                    <td className="px-4 py-3">
                      {managedUser.is_active ? "Aktív" : "Inaktív"}
                    </td>
                    <td className="px-4 py-3">
                      {managedUser.id !== user.id && (
                        <button
                          onClick={() => handleToggleActive(managedUser)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          {managedUser.is_active ? "Deaktiválás" : "Aktiválás"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
