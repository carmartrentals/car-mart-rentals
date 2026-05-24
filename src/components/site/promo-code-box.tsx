"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/** Displays a promo code with a one-click copy button. */
export function PromoCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(code).then(
      () => {
        trackEvent("promo_code_copied", { code });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-gold-400/40 bg-white/5 px-4 py-2.5 transition-colors hover:bg-white/10"
    >
      <span className="font-mono text-sm font-bold tracking-wider text-white">
        {code}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-gold-300">
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copy
          </>
        )}
      </span>
    </button>
  );
}
