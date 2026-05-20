"use client";

import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import type { StorageBucket } from "@/lib/storage";

/**
 * Multi-image uploader. Uploads each selected file to /api/admin/upload
 * and reports the resulting URLs via onChange.
 */
export function PhotoUpload({
  label,
  bucket,
  folder,
  urls,
  onChange,
  max = 12,
}: {
  label?: string;
  bucket: StorageBucket;
  folder: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    const next = [...urls];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= max) break;
        const form = new FormData();
        form.append("file", file);
        form.append("bucket", bucket);
        form.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed.");
        next.push(data.url);
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      )}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {urls.map((url, i) => (
          <div
            key={url + i}
            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-gold-400 hover:text-gold-600 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span className="text-xs font-medium">{busy ? "Uploading" : "Add"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
      <p className="mt-1.5 text-xs text-slate-400">
        {urls.length}/{max} photos · tap to take a photo or choose from gallery
      </p>
    </div>
  );
}
