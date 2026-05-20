"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { titleCase } from "@/lib/utils";

/**
 * Inline status dropdown that calls a bound server action on change.
 * Pass `action` already bound to the row id, e.g. setLeadStatus.bind(null, id).
 */
export function StatusSelect({
  value,
  options,
  action,
}: {
  value: string;
  options: string[];
  action: (status: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await action(next);
          router.refresh();
        });
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/40 disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {titleCase(o)}
        </option>
      ))}
    </select>
  );
}
