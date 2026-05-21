"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CalendarMinus, Check, X, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { resolveReservationRequest } from "@/app/admin/(panel)/reservations/request-actions";
import type { ReservationRequest } from "@/lib/types/database";

interface Projection {
  newDays: number;
  total: number;
  balanceDue: number;
  delta: number;
}

const TONE = {
  pending: "amber",
  approved: "green",
  declined: "red",
} as const;

export function RequestPanel({
  requests,
  reservationId,
  currentTotal,
  currentDays,
  projections,
}: {
  requests: ReservationRequest[];
  reservationId: string;
  currentTotal: number;
  currentDays: number;
  projections: Record<string, Projection>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  function resolve(id: string, status: "approved" | "declined") {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await resolveReservationRequest(id, reservationId, status);
      setBusyId(null);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not update the request.");
    });
  }

  return (
    <Card className={pendingCount > 0 ? "border-amber-300 ring-1 ring-amber-200" : ""}>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            Customer Requests
          </span>
        </CardTitle>
        {pendingCount > 0 && (
          <Badge tone="amber">{pendingCount} pending</Badge>
        )}
      </CardHeader>
      <div className="divide-y divide-slate-100">
        {requests.map((req) => {
          const isExt = req.request_type === "extension";
          const Icon = isExt ? CalendarPlus : CalendarMinus;
          const isPending = req.status === "pending";
          const proj = projections[req.id];
          return (
            <div key={req.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Icon className="h-4 w-4 text-gold-600" />
                    {isExt ? "Extension Request" : "Early Return Request"}
                  </p>
                  {req.requested_at && (
                    <p className="mt-1 text-sm text-slate-600">
                      New return date:{" "}
                      <span className="font-medium text-slate-800">
                        {formatDateTime(req.requested_at)}
                      </span>
                    </p>
                  )}
                  {req.note && (
                    <p className="mt-1 text-sm text-slate-500">
                      &ldquo;{req.note}&rdquo;
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Submitted {formatDateTime(req.created_at)}
                  </p>
                </div>
                <Badge tone={TONE[req.status]}>
                  {req.status[0].toUpperCase() + req.status.slice(1)}
                </Badge>
              </div>

              {/* What approving this request will do */}
              {isPending && proj && (
                <div
                  className={`mt-3 rounded-lg border p-3.5 ${
                    proj.delta >= 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      proj.delta > 0
                        ? "text-emerald-800"
                        : proj.delta < 0
                          ? "text-amber-800"
                          : "text-slate-700"
                    }`}
                  >
                    {proj.delta > 0
                      ? `Approving collects ${formatCurrency(proj.delta)} more`
                      : proj.delta < 0
                        ? `Approving reduces the total by ${formatCurrency(
                            Math.abs(proj.delta),
                          )}`
                        : "Approving will not change the total"}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <Row
                      label="Rental length"
                      value={`${currentDays} → ${proj.newDays} day${
                        proj.newDays === 1 ? "" : "s"
                      }`}
                    />
                    <Row
                      label="Reservation total"
                      value={`${formatCurrency(currentTotal)} → ${formatCurrency(
                        proj.total,
                      )}`}
                    />
                    <Row
                      label="Balance due after approval"
                      value={formatCurrency(proj.balanceDue)}
                    />
                  </dl>
                </div>
              )}

              {isPending && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => resolve(req.id, "approved")}
                    loading={pending && busyId === req.id}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolve(req.id, "declined")}
                    disabled={pending && busyId === req.id}
                  >
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <div className="px-5 pb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {pendingCount > 0 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Approving a request automatically updates the rental&apos;s return
          date and recalculates the total and balance due.
        </p>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
