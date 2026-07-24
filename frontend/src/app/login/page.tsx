"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sikertelen bejelentkezés");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 px-1">
          <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-accent">
            KM
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Közmű Mester</span>
        </div>

        <div className="card p-8">
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink text-balance">
            Jelentkezz be a fiókodba
          </h1>
          <p className="mb-6 text-sm text-muted">Add meg az ügyfélfiókod adatait</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="field-label">
                Email cím
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Jelszó
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full">
              {isSubmitting ? "Bejelentkezés..." : "Bejelentkezés"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
