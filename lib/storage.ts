import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// SPEC.md 6. pont — "kezdetben helyi /uploads mappa, előkészítve
// S3-kompatibilis tárolóra való átállásra". A repó gyökerén kívül eső
// /uploads (nem a public/ alatt) + egy dedikált API route a kiszolgáláshoz
// (app/api/attachments/[filename]) — ez ugyanaz az abstrakció, amit egy
// S3-migráció is használna (egy útvonal, ami tud fájlt olvasni), így a
// későbbi váltás a hívók módosítása nélkül elvégezhető.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // SPEC.md 4.6 — 15 MB
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export class InvalidAttachmentError extends Error {}

export async function saveAttachment(file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new InvalidAttachmentError("A csatolt fájl csak PDF, JPG vagy PNG lehet.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new InvalidAttachmentError("A csatolt fájl mérete legfeljebb 15 MB lehet.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const extension = path.extname(file.name) || defaultExtensionFor(file.type);
  const filename = `${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return filename;
}

export function attachmentPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

function defaultExtensionFor(mimeType: string): string {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  return ".jpg";
}
