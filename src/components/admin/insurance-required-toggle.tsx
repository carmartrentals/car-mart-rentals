"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setReservationInsuranceRequired } from "@/app/admin/(panel)/reservations/actions";

/**
 * Per-reservation switch — when on, check-out is blocked until the
 * customer's proof of insurance has been verified.
 */
export function InsuranceRequiredToggle({
  reservationId,
  required,
}: {
  reservationId: string;
  required: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(required);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setError(null);
    setOn(next);
    startTransition(async () => {
      const res = await setReservationInsuranceRequired(reservationId, next);
      if (res.ok) {
        router.refresh();
      } else {
        setOn(!next);
        setError(res.error ?? "Could not update.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">
            Require proof of insurance for this rental
          </p>
          <p className="text-xs text-slate-500">
            When on, the car cannot be checked out until insurance is verified.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            on ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </span>
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
