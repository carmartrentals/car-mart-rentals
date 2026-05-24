"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { decodeVinAction } from "@/app/admin/(panel)/vehicles/vin-actions";

/**
 * Sits inside the vehicle form, next to the VIN input. Reads the VIN out of
 * its parent form, calls the server-side decoder, and writes the returned
 * year/make/model/trim/features/etc. back into the form's other inputs.
 *
 * Works on the create page (fresh form) and on the edit page (overwrites
 * existing values). Because the form fields are uncontrolled (defaultValue),
 * directly setting `.value` on the native elements is fine — React keeps
 * its hands off and the next form submission uses the new values.
 */
export function VinDecoderButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault(); // don't submit the form
    setError(null);
    setSuccess(null);

    const form = e.currentTarget.closest("form");
    if (!form) return;
    const vinInput = form.elements.namedItem("vin") as unknown as
      | HTMLInputElement
      | null;
    const vin = vinInput?.value.trim();
    if (!vin) {
      setError("Type the VIN in the box first.");
      return;
    }

    startTransition(async () => {
      const res = await decodeVinAction(vin);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Could not decode that VIN.");
        return;
      }

      const data = res.data;
      const set = (name: string, value: string | number | null | undefined) => {
        if (value === null || value === undefined || value === "") return;
        // namedItem can return a RadioNodeList when several inputs share a
        // name (e.g. multiple hidden gallery_urls). We only set when it's a
        // single element with a value property.
        const el = form.elements.namedItem(name) as
          | (Element & { value?: string })
          | null;
        if (el && "value" in el) el.value = String(value);
      };

      set("year", data.year ?? undefined);
      set("make", data.make ?? undefined);
      set("model", data.model ?? undefined);
      set("trim", data.trim ?? undefined);
      set("doors", data.doors ?? undefined);
      // Don't overwrite seats — NHTSA doesn't return this reliably.
      if (data.category) set("category", data.category);
      if (data.fuelType) set("fuel_type", data.fuelType);
      if (data.transmission) set("transmission", data.transmission);

      // Features → textarea, newline-separated. Preserve any existing lines
      // by appending, but de-dup case-insensitively.
      if (data.features.length > 0) {
        const ta = form.elements.namedItem("features") as unknown as
          | HTMLTextAreaElement
          | null;
        if (ta) {
          const existing = ta.value
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);
          const lower = new Set(existing.map((s) => s.toLowerCase()));
          const merged = [...existing];
          for (const f of data.features) {
            if (!lower.has(f.toLowerCase())) {
              merged.push(f);
              lower.add(f.toLowerCase());
            }
          }
          ta.value = merged.join("\n");
        }
      }

      const summary = [
        data.year,
        data.make,
        data.model,
        data.trim,
        data.features.length ? `· ${data.features.length} features` : null,
      ]
        .filter(Boolean)
        .join(" ");
      setSuccess(`Auto-filled: ${summary}`);
    });
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-gold-400/40 bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold-700 transition-colors hover:border-gold-500/60 hover:bg-gold-100 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Decoding…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Auto-fill from VIN
          </>
        )}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {success && <p className="mt-1 text-xs text-emerald-700">{success}</p>}
    </div>
  );
}
