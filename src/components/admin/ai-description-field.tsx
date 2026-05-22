"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { generateVehicleDescription } from "@/app/admin/(panel)/vehicles/actions";

/**
 * The Public Description field with an AI "Generate" button. Reads the
 * vehicle's make/model/year/category/features from the surrounding form.
 */
export function AiDescriptionField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const get = (name: string) => {
      const el = form.elements.namedItem(name) as { value?: unknown } | null;
      return el && el.value != null ? String(el.value) : "";
    };
    setError(null);
    start(async () => {
      const res = await generateVehicleDescription({
        year: get("year"),
        make: get("make"),
        model: get("model"),
        category: get("category"),
        features: get("features"),
      });
      if (res.ok && res.text) {
        setValue(res.text);
      } else {
        setError(res.error ?? "Could not generate a description.");
      }
    });
  }

  return (
    <div>
      <Textarea
        name="description"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-600" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-gold-600" />
          )}
          {pending ? "Writing…" : "Generate with AI"}
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
        <span className="text-xs text-slate-400">
          Fills from the make, model, year, category &amp; features above.
        </span>
      </div>
    </div>
  );
}
