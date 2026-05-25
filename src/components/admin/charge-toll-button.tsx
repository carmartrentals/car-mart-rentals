"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { formatCurrency } from "@/lib/utils";
import { chargeViolationToCustomer } from "@/app/admin/(panel)/violations/actions";

/**
 * Inline "Charge Customer" button shown on each unpaid toll row that has a
 * matched reservation. Opens a confirm modal so the operator can review the
 * handling fee before billing.
 */
export function ChargeTollButton({
  violationId,
  tollAmount,
  defaultHandlingFee,
  reservationNumber,
  customerName,
}: {
  violationId: string;
  tollAmount: number;
  defaultHandlingFee: number;
  reservationNumber: string;
  customerName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(String(defaultHandlingFee));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const feeNum = Number(fee) || 0;
  const total = tollAmount + feeNum;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await chargeViolationToCustomer(violationId, feeNum);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not charge the customer.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <Receipt className="h-3.5 w-3.5" />
        Charge Customer
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Charge Toll to Customer"
        description={`Bill this toll back to ${customerName || "the renter"} on reservation ${reservationNumber}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Charge {formatCurrency(total)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Toll amount</span>
              <span className="font-medium">{formatCurrency(tollAmount)}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-slate-600">Handling fee</span>
              <span className="font-medium">{formatCurrency(feeNum)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-800">
                Total to charge
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <Field
            label="Handling fee ($)"
            hint="Markup added on top of the toll. Default is set in Settings."
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </Field>

          <p className="text-xs text-slate-500">
            This will add a line item to the reservation, recompute the balance
            due, and email the customer a receipt.
          </p>
        </div>
      </Modal>
    </>
  );
}
