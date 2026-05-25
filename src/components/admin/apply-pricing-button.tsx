"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { applyPricingSuggestion } from "@/app/admin/(panel)/pricing/actions";

export function ApplyPricingButton({
  vehicleId,
  rates,
}: {
  vehicleId: string;
  rates: {
    daily: number | null;
    weekend: number | null;
    weekly: number | null;
    monthly: number | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasChange =
    !!rates.daily || !!rates.weekend || !!rates.weekly || !!rates.monthly;
  if (!hasChange) return null;

  function apply() {
    if (!window.confirm("Apply this pricing change to the vehicle?")) return;
    startTransition(async () => {
      const res = await applyPricingSuggestion(vehicleId, {
        daily: rates.daily,
        weekend: rates.weekend,
        weekly: rates.weekly,
        monthly: rates.monthly,
      });
      if (res.ok) router.refresh();
      else window.alert(res.error ?? "Could not apply.");
    });
  }

  return (
    <button
      onClick={apply}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      Apply
    </button>
  );
}
