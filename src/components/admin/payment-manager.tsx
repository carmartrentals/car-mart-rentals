"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Link2, Loader2, ShieldCheck, Copy, ExternalLink, Undo2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import { DEPOSIT_STATUS } from "@/lib/constants";
import {
  recordManualPayment, createPaymentLink, createDepositAuthorization,
  captureDeposit, releaseDeposit, refundPayment,
} from "@/app/admin/(panel)/reservations/payment-actions";
import type { Payment, Deposit, PaymentMethod } from "@/lib/types/database";

export function PaymentManager({
  reservationId,
  balanceDue,
  depositAmount,
  payments,
  deposit,
}: {
  reservationId: string;
  balanceDue: number;
  depositAmount: number;
  payments: Payment[];
  deposit: Deposit | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"record" | "capture" | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  // Record-payment form
  const [amount, setAmount] = useState(String(balanceDue || ""));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [payType, setPayType] = useState<"payment" | "refund">("payment");
  const [notes, setNotes] = useState("");

  // Deposit capture form
  const [captureAmount, setCaptureAmount] = useState(String(depositAmount || ""));

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.data?.url) setLinkUrl(String(res.data.url));
        setModal(null);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments &amp; Deposit</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setModal("record")}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
          <Button
            size="sm"
            onClick={() => run(() => createPaymentLink(reservationId))}
            loading={pending}
          >
            <Link2 className="h-4 w-4" /> Stripe Payment Link
          </Button>
        </div>
      </CardHeader>

      <CardBody className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Payments list */}
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="text-slate-500">{formatDateTime(p.created_at)}</TD>
                  <TD>{titleCase(p.payment_type)}</TD>
                  <TD className="text-slate-500">{titleCase(p.method)}</TD>
                  <TD>
                    <Badge tone={p.status === "succeeded" ? "green" : "amber"}>
                      {titleCase(p.status)}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium">
                    {p.payment_type === "refund" ? "-" : ""}
                    {formatCurrency(p.amount)}
                  </TD>
                  <TD className="text-right">
                    {p.payment_type === "payment" && p.status === "succeeded" && (
                      <button
                        onClick={() => run(() => refundPayment(p.id))}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600"
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Refund
                      </button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {/* Deposit */}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold-600" />
              <span className="text-sm font-semibold text-slate-800">
                Security Deposit
              </span>
              {deposit && (
                <Badge tone={DEPOSIT_STATUS[deposit.status].tone}>
                  {DEPOSIT_STATUS[deposit.status].label}
                </Badge>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(depositAmount)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(!deposit || ["pending", "released", "refunded"].includes(deposit.status)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(() => createDepositAuthorization(reservationId))}
                loading={pending}
              >
                Authorize Deposit (Stripe)
              </Button>
            )}
            {deposit?.status === "authorized" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setModal("capture")}>
                  Capture
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => run(() => releaseDeposit(deposit.id))}
                  loading={pending}
                >
                  Release Hold
                </Button>
              </>
            )}
            {deposit && ["captured", "partially_captured"].includes(deposit.status) && (
              <p className="text-xs text-slate-500">
                Captured {formatCurrency(deposit.captured_amount)} on{" "}
                {formatDateTime(deposit.captured_at)}
              </p>
            )}
          </div>
        </div>
      </CardBody>

      {/* Record payment modal */}
      <Modal
        open={modal === "record"}
        onClose={() => setModal(null)}
        title="Record Payment"
        description="Log a cash, terminal or bank-transfer payment."
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                run(() =>
                  recordManualPayment(reservationId, {
                    amount: Number(amount),
                    method,
                    type: payType,
                    notes,
                  }),
                )
              }
            >
              Save Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <Select
                value={payType}
                onChange={(e) => setPayType(e.target.value as "payment" | "refund")}
              >
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
              </Select>
            </Field>
          </div>
          <Field label="Method">
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card (terminal)</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference, payer, etc."
            />
          </Field>
        </div>
      </Modal>

      {/* Capture deposit modal */}
      <Modal
        open={modal === "capture"}
        onClose={() => setModal(null)}
        title="Capture Security Deposit"
        description="Charge part or all of the authorized deposit for damage or fees."
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                deposit &&
                run(() => captureDeposit(deposit.id, Number(captureAmount)))
              }
            >
              Capture Amount
            </Button>
          </>
        }
      >
        <Field label="Amount to capture" hint={`Maximum ${formatCurrency(depositAmount)}`}>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={depositAmount}
            value={captureAmount}
            onChange={(e) => setCaptureAmount(e.target.value)}
          />
        </Field>
      </Modal>

      {/* Stripe link result modal */}
      <Modal
        open={linkUrl !== null}
        onClose={() => setLinkUrl(null)}
        title="Stripe Payment Link"
        description="Send this secure link to the customer to collect payment."
        footer={
          <Button onClick={() => setLinkUrl(null)}>Done</Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <input
              readOnly
              value={linkUrl ?? ""}
              className="flex-1 bg-transparent text-xs text-slate-600 outline-none"
            />
            <button
              onClick={() => linkUrl && navigator.clipboard.writeText(linkUrl)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <a
            href={linkUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Open payment page
          </a>
        </div>
      </Modal>
    </Card>
  );
}
