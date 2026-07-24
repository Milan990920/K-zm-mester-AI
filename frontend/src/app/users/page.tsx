"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, ManagedUser, createUser, listUsers, setUserActive } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/layout/PageShell";
import { TopNav } from "@/components/layout/TopNav";

const ROLE_LABELS: Record<ManagedUser["role"], string> = {
  customer_admin: "Ügyfél adminisztrátor",
  customer_user: "Ügyfél felhasználó",
};

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading, logout, accessToken } = useAuth();
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
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Betöltés...</p>
      </main>
    );
  }

  return (
    <PageShell>
      <TopNav active="users" role={user.role} onLogout={logout} />

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">Felhasználók</h1>

      <div className="card mb-8 p-5">
        <h2 className="section-title">Új felhasználó meghívása</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            placeholder="Teljes név"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="field-input"
          />
          <input
            type="email"
            required
            placeholder="Email cím"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Jelszó (min. 8 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ManagedUser["role"])}
            className="field-select"
          >
            <option value="customer_user">Ügyfél felhasználó</option>
            <option value="customer_admin">Ügyfél adminisztrátor</option>
          </select>
          <button type="submit" disabled={isSubmitting} className="btn-primary sm:col-span-2">
            Meghívás
          </button>
          {formError && (
            <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad sm:col-span-2">
              {formError}
            </p>
          )}
        </form>
      </div>

      {isFetching && <p className="text-sm text-muted">Betöltés...</p>}
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">{error}</p>}

      {!isFetching && !error && (
        <div className="card overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr>
                <th>Név</th>
                <th>Email</th>
                <th>Szerepkör</th>
                <th>Állapot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((managedUser) => (
                <tr key={managedUser.id}>
                  <td>{managedUser.full_name}</td>
                  <td className="font-mono">{managedUser.email}</td>
                  <td>{ROLE_LABELS[managedUser.role]}</td>
                  <td>
                    <span className={managedUser.is_active ? "pill-good" : "pill-neutral"}>
                      {managedUser.is_active ? "Aktív" : "Inaktív"}
                    </span>
                  </td>
                  <td>
                    {managedUser.id !== user.id && (
                      <button
                        onClick={() => handleToggleActive(managedUser)}
                        className="text-xs text-muted hover:text-accent"
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
    </PageShell>
  );
}
