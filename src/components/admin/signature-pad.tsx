"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Check, Loader2, RefreshCw } from "lucide-react";

/**
 * Canvas signature pad. Captures a drawn signature, uploads it to the
 * private `signatures` bucket and reports the resulting URL.
 */
export function SignaturePad({
  label,
  folder,
  url,
  onChange,
}: {
  label: string;
  folder: string;
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Scale for crisp lines on high-DPI screens.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2029";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setError(null);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !dirty.current) {
      setError("Please sign in the box first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not capture signature.");
      const form = new FormData();
      form.append("file", new File([blob], "signature.png", { type: "image/png" }));
      form.append("bucket", "signatures");
      form.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save signature.");
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Signature" className="h-20 w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-gold-600"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-sign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-32 w-full touch-none rounded-lg border border-slate-300 bg-white"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save Signature
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
