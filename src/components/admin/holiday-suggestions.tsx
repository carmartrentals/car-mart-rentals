"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CalendarHeart, Wand2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";

interface HolidayItem {
  slug: string;
  name: string;
  date: string; // ISO
  daysUntil: number;
  vibe: string;
}

export function HolidaySuggestions({ holidays }: { holidays: HolidayItem[] }) {
  const router = useRouter();
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate(slug: string) {
    setError(null);
    setGeneratingSlug(slug);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/marketing/suggest-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holiday_slug: slug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed.");

        // Pass the generated content to the composer via URL params. URL
        // length is fine — total payload is ~500 chars, well under the
        // 2KB limit browsers/servers handle.
        const q = new URLSearchParams({
          name: data.name ?? "",
          subject: data.subject ?? "",
          preheader: data.preheader ?? "",
          body: data.body ?? "",
          promo_code: data.suggested_promo_code ?? "",
          discount_percent: String(data.suggested_discount_percent ?? ""),
          holiday: slug,
        });
        router.push(`/admin/marketing/new?${q.toString()}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed.");
        setGeneratingSlug(null);
      }
    });
  }

  if (holidays.length === 0) {
    return null;
  }

  return (
    <Card className="border-gold-200 bg-gradient-to-br from-gold-50/50 to-white">
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-600" />
            AI Campaign Suggestions
          </span>
        </CardTitle>
        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-800">
          {holidays.length} upcoming
        </span>
      </CardHeader>
      <CardBody>
        {error && (
          <div className="mb-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <p className="mb-4 text-xs text-slate-500">
          Holidays in the next 45 days. Click <strong>Generate with AI</strong>{" "}
          on any one to get a full email draft (subject, preheader, body,
          suggested promo code) ready to send.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {holidays.map((h) => {
            const date = new Date(h.date);
            const dateLabel = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            });
            const isSoon = h.daysUntil <= 14;
            const isGenerating = pending && generatingSlug === h.slug;
            return (
              <li
                key={h.slug}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <CalendarHeart className="h-3.5 w-3.5 text-gold-600" />
                      {h.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {dateLabel}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isSoon
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {h.daysUntil === 0
                      ? "Today"
                      : h.daysUntil === 1
                        ? "Tomorrow"
                        : `${h.daysUntil}d`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => generate(h.slug)}
                  disabled={pending}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      Generate with AI
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
