import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase Storage helper — SERVER ONLY.
 *
 * Buckets (see supabase/migrations/0004_storage.sql):
 *   vehicle-photos  PUBLIC   — returns a permanent public URL
 *   documents | inspections | agreements | invoices | signatures
 *                   PRIVATE  — returns a long-lived signed URL
 */

export const STORAGE_BUCKETS = [
  "vehicle-photos",
  "documents",
  "inspections",
  "agreements",
  "invoices",
  "signatures",
] as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

// Signed URLs for private buckets — effectively permanent (10 years).
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

export interface UploadResult {
  url: string;
  path: string;
  bucket: StorageBucket;
}

/** Upload a file to a bucket and return a usable URL. */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  body: Buffer | ArrayBuffer | Blob,
  contentType: string,
): Promise<UploadResult> {
  const admin = createAdminClient();

  const { error } = await admin.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  if (bucket === "vehicle-photos") {
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path, bucket };
  }

  const { data, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !data) {
    throw new Error(`Could not create signed URL: ${signErr?.message ?? "unknown"}`);
  }
  return { url: data.signedUrl, path, bucket };
}

/** Upload a base64 data URL (e.g. a signature canvas export). */
export async function uploadDataUrl(
  bucket: StorageBucket,
  path: string,
  dataUrl: string,
): Promise<UploadResult> {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL.");
  const [, contentType, base64] = match;
  return uploadFile(bucket, path, Buffer.from(base64, "base64"), contentType);
}

/** Build a unique storage path inside a folder. */
export function storagePath(folder: string, ext = "jpg"): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 9);
  return `${folder}/${stamp}-${rand}.${ext.replace(/[^a-z0-9]/gi, "") || "jpg"}`;
}
