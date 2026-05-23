"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import {
  approveReferral,
  declineReferral,
} from "@/app/admin/(panel)/referrals/actions";

interface Row {
  id: string;
  status: string;
  createdAt: string;
  referrerName: string;
  referrerEmail: string | null;
  referredName: string;
  reservationId: string | null;
  reservationNumber: string | null;
}

const TONE: Record<string, "amber" | "green" | "gray" | "red"> = {
  pending: "amber",
  completed: "green",
  declined: "red",
};

export function ReferralsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  return (
    <>
      {error && (
        <div className="px-5 pt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Referrer</TH>
            <TH>Referred Friend</TH>
            <TH>Reservation</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="text-slate-500 whitespace-nowrap">{r.createdAt}</TD>
              <TD>
                <span className="block font-medium text-slate-800">
                  {r.referrerName}
                </span>
                {r.referrerEmail && (
                  <span className="block text-xs text-slate-500">
                    {r.referrerEmail}
                  </span>
                )}
              </TD>
              <TD className="text-slate-700">{r.referredName}</TD>
              <TD>
                {r.reservationId && r.reservationNumber ? (
                  <Link
                    href={`/admin/reservations/${r.reservationId}`}
                    className="text-sm font-medium text-gold-700 hover:text-gold-600"
                  >
                    {r.reservationNumber}
                  </Link>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TD>
              <TD>
                <Badge tone={TONE[r.status] ?? "gray"}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </Badge>
              </TD>
              <TD className="text-right">
                {r.status === "pending" ? (
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => run(() => approveReferral(r.id))}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Credit
                    </button>
                    <button
                      onClick={() => run(() => declineReferral(r.id))}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
