"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getDashboardBriefing } from "@/app/admin/(panel)/dashboard-actions";

/** AI-generated daily briefing card for the dashboard. */
export function AiBriefing() {
  const [pending, start] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const res = await getDashboardBriefing();
      if (res.ok && res.text) {
        setText(res.text);
      } else {
        setError(res.error ?? "Could not generate the briefing.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-gold-600" /> AI Daily Briefing
        </h2>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {text ? "Refresh" : "Generate"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {text ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
      ) : (
        !error && (
          <p className="mt-3 text-sm text-slate-400">
            Generate a plain-language summary of where things stand today.
          </p>
        )
      )}
    </div>
  );
}
