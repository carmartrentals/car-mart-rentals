"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Loader2 } from "lucide-react";
import { setRecurringCampaignActive } from "@/app/admin/(panel)/marketing/actions";

export function RecurringPauseToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setRecurringCampaignActive(id, !isActive);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      title={isActive ? "Pause this recurring schedule" : "Resume sending"}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        <>
          <Pause className="h-3.5 w-3.5" /> Pause
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" /> Resume
        </>
      )}
    </button>
  );
}
