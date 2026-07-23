"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, DocumentUploadResult, uploadDocument } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STATUS_LABELS: Record<DocumentUploadResult["status"], string> = {
  uploaded: "Feltöltve",
  processing: "Feldolgozás alatt",
  done: "Feldolgozva",
  failed: "Sikertelen",
  needs_review: "Ellenőrzés szükséges",
};

const STATUS_COLORS: Record<DocumentUploadResult["status"], string> = {
  uploaded: "text-slate-500",
  processing: "text-slate-500",
  done: "text-emerald-600",
  failed: "text-red-600",
  needs_review: "text-amber-600",
};

interface UploadItem {
  filename: string;
  status: "uploading" | "done" | "error";
  result?: DocumentUploadResult;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading, accessToken } = useAuth();
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Számla feltöltés</h1>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
            Vissza a dashboardra
          </Link>
        </header>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive ? "border-slate-500 bg-slate-100" : "border-slate-300 bg-white"
          }`}
        >
          <p className="mb-1 text-sm font-medium text-slate-700">
            Húzd ide a PDF számlá(ka)t, vagy kattints a tallózáshoz
          </p>
          <p className="text-xs text-slate-400">Több fájl is kiválasztható egyszerre</p>
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
              <li
                key={`${item.filename}-${index}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{item.filename}</span>
                {item.status === "uploading" && (
                  <span className="text-slate-400">Feltöltés és feldolgozás...</span>
                )}
                {item.status === "done" && item.result && (
                  <span className={`font-medium ${STATUS_COLORS[item.result.status]}`}>
                    {STATUS_LABELS[item.result.status]}
                  </span>
                )}
                {item.status === "error" && (
                  <span className="font-medium text-red-600">{item.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
