"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, DocumentUploadResult, uploadDocument } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/layout/PageShell";
import { TopNav } from "@/components/layout/TopNav";

const STATUS_LABELS: Record<DocumentUploadResult["status"], string> = {
  uploaded: "Feltöltve",
  processing: "Feldolgozás alatt",
  done: "Feldolgozva",
  failed: "Sikertelen",
  needs_review: "Ellenőrzés szükséges",
};

const STATUS_PILL_CLASS: Record<DocumentUploadResult["status"], string> = {
  uploaded: "pill-neutral",
  processing: "pill-neutral",
  done: "pill-good",
  failed: "pill-bad",
  needs_review: "pill-warn",
};

interface UploadItem {
  filename: string;
  status: "uploading" | "done" | "error";
  result?: DocumentUploadResult;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading, logout, accessToken } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  async function handleFiles(files: FileList | null) {
    if (!files || !accessToken) return;

    const pdfFiles = Array.from(files).filter((file) => file.type === "application/pdf");

    for (const file of pdfFiles) {
      setItems((prev) => [...prev, { filename: file.name, status: "uploading" }]);
      try {
        const result = await uploadDocument(accessToken, file);
        setItems((prev) =>
          prev.map((item) =>
            item.filename === file.name && item.status === "uploading"
              ? { ...item, status: "done", result }
              : item,
          ),
        );
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Ismeretlen hiba történt";
        setItems((prev) =>
          prev.map((item) =>
            item.filename === file.name && item.status === "uploading"
              ? { ...item, status: "error", error: message }
              : item,
          ),
        );
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Betöltés...</p>
      </main>
    );
  }

  return (
    <PageShell>
      <TopNav active="upload" role={user.role} onLogout={logout} />

      <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">Számla feltöltés</h1>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive ? "border-accent bg-accent-soft" : "border-border bg-card"
        }`}
      >
        <div className="mb-2 text-2xl">📄</div>
        <p className="mb-1 text-sm font-semibold text-ink">
          Húzd ide a PDF számlá(ka)t, vagy kattints a tallózáshoz
        </p>
        <p className="text-xs text-faint">Több fájl is kiválasztható egyszerre</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={`${item.filename}-${index}`} className="card flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-ink">{item.filename}</span>
              {item.status === "uploading" && (
                <span className="pill-neutral">Feltöltés és feldolgozás...</span>
              )}
              {item.status === "done" && item.result && (
                <span className={STATUS_PILL_CLASS[item.result.status]}>
                  {STATUS_LABELS[item.result.status]}
                </span>
              )}
              {item.status === "error" && <span className="pill-bad">{item.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
