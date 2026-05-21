"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, CalendarPlus, CalendarMinus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import {
  payMyBalance, requestExtension, requestEarlyReturn,
} from "@/app/account/(portal)/actions";

interface RequestSummary {
  request_type: "extension" | "early_return";
  status: "pending" | "approved" | "declined";
}

type Mode = "extension" | "early_return";

/** Customer-facing actions: pay balance, request extension or early return. */
export function ReservationActions({
  reservationId,
  balanceDue,
  requests = [],
}: {
  reservationId: string;
  balanceDue: number;
  requests?: RequestSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");

  const hasPending = (t: Mode) =>
    requests.some((r) => r.request_type === t && r.status === "pending");

  function pay() {
    setPayError(null);
    startTransition(async () => {
      const res = await payMyBalance(reservationId);
      if (res.ok && res.data?.url) {
        window.location.href = String(res.data.url);
      } else {
        setPayError(res.error ?? "Could not start payment.");
      }
    });
  }

  function openModal(m: Mode) {
    setError(null);
    setDone(false);
    setRequestedDate("");
    setNote("");
    setMode(m);
  }

  function submit() {
    if (!mode) return;
    setError(null);
    startTransition(async () => {
      const fn = mode === "extension" ? requestExtension : requestEarlyReturn;
      const res = await fn(reservationId, requestedDate, note);
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not submit your request.");
      }
    });
  }

  const isExt = mode === "extension";

  return (
    <div className="space-y-3">
      {payError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {payError}
        </div>
      )}

      {balanceDue > 0 && (
        <Button onClick={pay} loading={pending} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay Balance
        </Button>
      )}

      {hasPending("extension") ? (
        <PendingNote label="Extension" />
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => openModal("extension")}
        >
          <CalendarPlus className="h-4 w-4" /> Request Extension
        </Button>
      )}

      {hasPending("early_return") ? (
        <PendingNote label="Early return" />
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => openModal("early_return")}
        >
          <CalendarMinus className="h-4 w-4" /> Request Early Return
        </Button>
      )}

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={isExt ? "Request a Rental Extension" : "Request an Early Return"}
        footer={
          done ? (
            <Button onClick={() => setMode(null)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={pending}>
                Submit Request
              </Button>
            </>
          )
        }
      >
        {done ? (
          <p className="text-sm text-slate-600">
            Your request has been sent. Our team will review it and contact you
            shortly to confirm availability and pricing.
          </p>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field
              label={
                isExt
                  ? "Requested new return date"
                  : "Requested earlier return date"
              }
            >
              <Input
                type="datetime-local"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </Field>
            <Field label="Note (optional)">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isExt
                    ? "Let us know how much longer you need the vehicle..."
                    : "Let us know when you'd like to return the vehicle..."
                }
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PendingNote({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-300">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {label} request pending — our team will contact you.
    </p>
  );
}
