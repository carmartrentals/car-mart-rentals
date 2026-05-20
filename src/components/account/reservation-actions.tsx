"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { payMyBalance, requestExtension } from "@/app/account/(portal)/actions";

/** Customer-facing actions on a reservation: pay balance, request extension. */
export function ReservationActions({
  reservationId,
  balanceDue,
}: {
  reservationId: string;
  balanceDue: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [extOpen, setExtOpen] = useState(false);
  const [extDone, setExtDone] = useState(false);
  const [requestedReturn, setRequestedReturn] = useState("");
  const [note, setNote] = useState("");

  function pay() {
    setError(null);
    startTransition(async () => {
      const res = await payMyBalance(reservationId);
      if (res.ok && res.data?.url) {
        window.location.href = String(res.data.url);
      } else {
        setError(res.error ?? "Could not start payment.");
      }
    });
  }

  function submitExtension() {
    setError(null);
    startTransition(async () => {
      const res = await requestExtension(reservationId, requestedReturn, note);
      if (res.ok) {
        setExtDone(true);
      } else {
        setError(res.error ?? "Could not submit request.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}

      {balanceDue > 0 && (
        <Button onClick={pay} loading={pending} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay Balance
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => {
          setExtDone(false);
          setExtOpen(true);
        }}
        className="w-full"
      >
        <CalendarPlus className="h-4 w-4" /> Request Extension
      </Button>

      <Modal
        open={extOpen}
        onClose={() => setExtOpen(false)}
        title="Request a Rental Extension"
        footer={
          extDone ? (
            <Button onClick={() => setExtOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setExtOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitExtension} loading={pending}>
                Submit Request
              </Button>
            </>
          )
        }
      >
        {extDone ? (
          <p className="text-sm text-slate-600">
            Your extension request has been sent. Our team will contact you
            shortly to confirm availability and pricing.
          </p>
        ) : (
          <div className="space-y-4">
            <Field label="Requested new return date">
              <Input
                type="datetime-local"
                value={requestedReturn}
                onChange={(e) => setRequestedReturn(e.target.value)}
              />
            </Field>
            <Field label="Note (optional)">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything we should know..."
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
