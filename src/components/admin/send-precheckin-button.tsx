"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check } from "lucide-react";
import { sendPrecheckinInvite } from "@/app/admin/(panel)/reservations/actions";

export function SendPrecheckinButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendPrecheckinInvite(reservationId);
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 3500);
        router.refresh();
      } else {
        setError(res.error ?? "Could not send the invite.");
      }
    });
  }

  return (
    <>
      <button
        onClick={send}
        disabled={pending || sent}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gold-400/60 bg-gold-50 px-3 py-1.5 text-xs font-medium text-gold-700 transition-colors hover:border-gold-500 hover:bg-gold-100 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : sent ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {sent ? "Email sent" : "Email Pre-Check-In Link to Customer"}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </>
  );
}
