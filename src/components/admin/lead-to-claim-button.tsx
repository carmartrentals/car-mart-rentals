"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { convertLeadToClaim } from "@/app/admin/(panel)/leads/actions";

/** Converts a lead into an insurance claim and opens the Claims page. */
export function LeadToClaimButton({
  leadId,
  converted,
}: {
  leadId: string;
  converted: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (converted) {
    return <span className="text-xs font-medium text-emerald-600">Converted</span>;
  }

  function run() {
    if (!window.confirm("Create an insurance claim from this lead?")) return;
    setError(null);
    start(async () => {
      const res = await convertLeadToClaim(leadId);
      if (res.ok) {
        router.push("/admin/claims");
        router.refresh();
      } else {
        setError(res.error ?? "Could not convert this lead.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-gold-600" />
        )}
        Create Claim
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
