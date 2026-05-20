import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  uploadFile,
  storagePath,
  STORAGE_BUCKETS,
  type StorageBucket,
} from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Authenticated upload endpoint for the admin app.
 * Accepts multipart/form-data: file, bucket, folder.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "") as StorageBucket;
  const folder = String(form.get("folder") ?? "misc").replace(/[^a-z0-9/_-]/gi, "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!STORAGE_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Invalid storage bucket." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 15 MB." },
      { status: 413 },
    );
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = storagePath(folder || "misc", ext);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(
      bucket,
      path,
      buffer,
      file.type || "application/octet-stream",
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 },
    );
  }
}
