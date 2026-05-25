"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteViolation } from "@/app/admin/(panel)/violations/actions";

/** Tiny inline delete button with confirm — for rows on the Tolls page. */
export function DeleteViolationButton({
  violationId,
  wasCharged,
}: {
  violationId: string;
  wasCharged: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const msg = wasCharged
      ? "This toll was already charged to the customer. Deleting it will also reverse that charge on their reservation. Continue?"
      : "Delete this toll record? This can't be undone.";
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteViolation(violationId);
      if (res.ok) router.refresh();
      else window.alert(res.error ?? "Could not delete.");
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      title="Delete toll record"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
