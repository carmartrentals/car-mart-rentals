"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Small button that copies a value to the clipboard. */
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
