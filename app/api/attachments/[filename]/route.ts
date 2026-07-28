export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { attachmentPath } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_request: NextRequest, { params }: { params: { filename: string } }) {
  // A fájlnevet mi generáljuk (UUID), de védekező jelleggel akkor is
  // elutasítjuk, ha bárhonnan path traversal próbálkozás érkezne.
  if (params.filename.includes("/") || params.filename.includes("..")) {
    return NextResponse.json({ error: "Érvénytelen fájlnév." }, { status: 400 });
  }

  try {
    const buffer = await readFile(attachmentPath(params.filename));
    const contentType = CONTENT_TYPES[path.extname(params.filename).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Content-Disposition": "inline" },
    });
  } catch {
    return NextResponse.json({ error: "A fájl nem található." }, { status: 404 });
  }
}
