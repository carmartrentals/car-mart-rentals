"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { uploadMyDocument } from "@/app/account/(portal)/actions";
import { compressImage } from "@/lib/image";

export function DocumentUpload({
  kind,
  label,
  hint,
  url,
}: {
  kind: string;
  label: string;
  hint?: string;
  url: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        // Shrink phone photos so the upload stays small and reliable.
        const prepared = await compressImage(file);
        if (prepared.size > 9 * 1024 * 1024) {
          setError("This file is too large. Please use a smaller photo or PDF.");
          return;
        }
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", prepared);
        const res = await uploadMyDocument(fd);
        if (res?.ok) router.refresh();
        else setError(res?.error ?? "Upload failed. Please try again.");
      } catch {
        setError(
          "Upload failed. Please try a smaller file or check your connection.",
        );
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        {url && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}

      <div className="mt-3 aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-brand-900">
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <Upload className="h-8 w-8" />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : url ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {pending ? "Uploading..." : url ? "Replace" : "Upload"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}
