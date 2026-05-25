"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, CalendarPlus, CalendarMinus, Clock, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { formatCurrency, rentalDays } from "@/lib/utils";
import {
  payMyBalance, payMyDeposit, requestExtension, requestEarlyReturn,
  cancelReservationRequest, cancelMyReservation,
} from "@/app/account/(portal)/actions";

interface RequestSummary {
  id: string;
  request_type: "extension" | "early_return";
  status: "pending" | "approved" | "declined";
}

type Mode = "extension" | "early_return";

/** ISO timestamp -> value for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Customer-facing actions: pay balance, request extension or early return. */
export function ReservationActions({
  reservationId,
  status,
  balanceDue,
  depositAmount = 0,
  depositStatus = null,
  pickupAt,
  returnAt,
  rateAmount,
  taxRate,
  cancellationHours,
  cancellationFeePercent,
  requests = [],
}: {
  reservationId: string;
  status: string;
  balanceDue: number;
  depositAmount?: number;
  depositStatus?: string | null;
  pickupAt: string;
  returnAt: string;
  rateAmount: number;
  taxRate: number;
  /** Free-cancellation window in hours, from admin Settings. */
  cancellationHours: number;
  /** Late-cancel fee as % of rental total, from admin Settings. */
  cancellationFeePercent: number;
  requests?: RequestSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canCancel = ["pending", "confirmed", "quote"].includes(status);
  // Use the policy from admin Settings (default 48h) so the customer sees
  // the same number we promised them on the booking page.
  const freeCancel =
    (new Date(pickupAt).getTime() - Date.now()) / 3_600_000 >=
    cancellationHours;

  function confirmCancel() {
    setCancelError(null);
    startTransition(async () => {
      const res = await cancelMyReservation(reservationId);
      if (res.ok) {
        setShowCancel(false);
        router.refresh();
      } else {
        setCancelError(res.error ?? "Could not cancel the booking.");
      }
    });
  }
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");

  const pendingExt = requests.find(
    (r) => r.request_type === "extension" && r.status === "pending",
  );
  const pendingEarly = requests.find(
    (r) => r.request_type === "early_return" && r.status === "pending",
  );

  // Live estimate of the cost change for the chosen date.
  const estimate = useMemo(() => {
    if (!requestedDate || !mode) return null;
    const newReturn = new Date(requestedDate);
    if (Number.isNaN(newReturn.getTime())) return null;
    const oldDays = rentalDays(pickupAt, returnAt);
    const newDays = rentalDays(pickupAt, newReturn);
    const delta =
      rateAmount * (newDays - oldDays) * (1 + (taxRate || 0) / 100);
    return {
      newDays,
      dayDelta: newDays - oldDays,
      delta: Math.round(delta * 100) / 100,
    };
  }, [requestedDate, mode, pickupAt, returnAt, rateAmount, taxRate]);

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

  function authorizeDeposit() {
    setPayError(null);
    startTransition(async () => {
      const res = await payMyDeposit(reservationId);
      if (res.ok && res.data?.url) {
        window.location.href = String(res.data.url);
      } else {
        setPayError(res.error ?? "Could not start the deposit authorization.");
      }
    });
  }

  function cancelRequest(requestId: string) {
    if (
      !window.confirm(
        "Cancel this request? You can submit a new one anytime.",
      )
    ) {
      return;
    }
    setActionError(null);
    setCancellingId(requestId);
    startTransition(async () => {
      const res = await cancelReservationRequest(requestId);
      setCancellingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setActionError(res.error ?? "Could not cancel the request.");
      }
    });
  }

  function openModal(m: Mode) {
    setError(null);
    setDone(false);
    setRequestedDate(toLocalInput(returnAt));
    setNote("");
    setMode(m);
  }

  function submit() {
    if (!mode) return;
    if (!requestedDate) {
      setError("Please choose a date.");
      return;
    }
    setError(null);
    const isoDate = new Date(requestedDate).toISOString();
    startTransition(async () => {
      const fn = mode === "extension" ? requestExtension : requestEarlyReturn;
      const res = await fn(reservationId, isoDate, note);
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
      {payError && <ErrorNote>{payError}</ErrorNote>}
      {actionError && <ErrorNote>{actionError}</ErrorNote>}

      {balanceDue > 0 && (
        <Button onClick={pay} loading={pending} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay Balance
        </Button>
      )}

      {depositAmount > 0 && depositStatus === "authorized" && (
        <div className="flex items-start gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Security deposit authorized — a {formatCurrency(depositAmount)} hold is
          on your card and will be released after you return the vehicle.
        </div>
      )}
      {depositAmount > 0 &&
        (!depositStatus || depositStatus === "pending") && (
          <div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={authorizeDeposit}
              loading={pending}
            >
              <ShieldCheck className="h-4 w-4" /> Authorize Deposit (
              {formatCurrency(depositAmount)})
            </Button>
            <p className="mt-1 text-center text-xs text-slate-500">
              A refundable hold — not a charge.
            </p>
          </div>
        )}

      {pendingExt ? (
        <PendingNote
          label="Extension"
          busy={pending && cancellingId === pendingExt.id}
          onCancel={() => cancelRequest(pendingExt.id)}
        />
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => openModal("extension")}
        >
          <CalendarPlus className="h-4 w-4" /> Request Extension
        </Button>
      )}

      {pendingEarly ? (
        <PendingNote
          label="Early return"
          busy={pending && cancellingId === pendingEarly.id}
          onCancel={() => cancelRequest(pendingEarly.id)}
        />
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => openModal("early_return")}
        >
          <CalendarMinus className="h-4 w-4" /> Request Early Return
        </Button>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={() => {
            setCancelError(null);
            setShowCancel(true);
          }}
          className="w-full pt-1 text-center text-xs font-medium text-slate-500 underline underline-offset-2 transition-colors hover:text-rose-300"
        >
          Cancel this booking
        </button>
      )}

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel This Booking?"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Booking
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={pending}>
              Cancel Booking
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {cancelError && <Alert tone="error">{cancelError}</Alert>}
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel this reservation? This can&apos;t be
            undone online.
          </p>
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              freeCancel
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {freeCancel
              ? `Your pickup is more than ${cancellationHours} hours away — this cancellation is free.`
              : `Your pickup is within ${cancellationHours} hours — a cancellation fee of up to ${cancellationFeePercent}% of the rental total may apply per our policy. Our team will follow up with you.`}
          </div>
        </div>
      </Modal>

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
            shortly to confirm. You can cancel the request from this page any
            time before it is approved.
          </p>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field
              label={
                isExt
                  ? "New return date & time"
                  : "Earlier return date & time"
              }
            >
              <Input
                type="datetime-local"
                value={requestedDate}
                min={isExt ? toLocalInput(returnAt) : toLocalInput(pickupAt)}
                max={isExt ? undefined : toLocalInput(returnAt)}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </Field>

            {estimate && estimate.dayDelta !== 0 && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  estimate.delta >= 0
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <p className="font-semibold">
                  {estimate.delta >= 0
                    ? `Estimated additional cost: ${formatCurrency(estimate.delta)}`
                    : `Estimated reduction: ${formatCurrency(Math.abs(estimate.delta))}`}
                </p>
                <p className="mt-0.5 text-xs">
                  Based on {Math.abs(estimate.dayDelta)} day
                  {Math.abs(estimate.dayDelta) === 1 ? "" : "s"} at{" "}
                  {formatCurrency(rateAmount)}/day plus tax. Final amount is
                  confirmed by our team.
                </p>
              </div>
            )}

            <Field label="Note (optional)">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isExt
                    ? "Let us know why you need more time..."
                    : "Let us know about your early return..."
                }
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PendingNote({
  label,
  busy,
  onCancel,
}: {
  label: string;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {label} request pending — our team will contact you.
      </p>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="mt-1.5 text-xs font-medium text-amber-200/70 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel this request"}
      </button>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      {children}
    </div>
  );
}
