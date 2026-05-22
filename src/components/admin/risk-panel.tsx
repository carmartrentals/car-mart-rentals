"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldQuestion, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { assessReservationRisk } from "@/app/admin/(panel)/reservations/actions";
import { formatDateTime } from "@/lib/utils";

const TONE: Record<string, "green" | "amber" | "red"> = {
  low: "green",
  medium: "amber",
  high: "red",
};
const LABEL: Record<string, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskPanel({
  reservationId,
  level,
  summary,
  assessedAt,
}: {
  reservationId: string;
  level: string | null;
  summary: string | null;
  assessedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
    level: string;
    summary: string;
    at: string;
  } | null>(
    level && summary
      ? { level, summary, at: assessedAt ?? new Date().toISOString() }
      : null,
  );

  function run() {
    setError(null);
    start(async () => {
      const res = await assessReservationRisk(reservationId);
      if (res.ok && res.level && res.summary) {
        setCurrent({
          level: res.level,
          summary: res.summary,
          at: new Date().toISOString(),
        });
        router.refresh();
      } else {
        setError(res.error ?? "Could not run the risk check.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-gold-600" /> AI Risk Check
          </span>
        </CardTitle>
        {current && (
          <Badge tone={TONE[current.level] ?? "gray"}>
            {LABEL[current.level] ?? current.level}
          </Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-3">
        {error && <Alert tone="error">{error}</Alert>}

        {current ? (
          <>
            <p className="text-sm text-slate-700">{current.summary}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Assessed {formatDateTime(current.at)}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={run}
                loading={pending}
              >
                <RefreshCw className="h-4 w-4" /> Re-check
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Run an AI check to flag fraud or loss risk on this booking —
              based on the customer, vehicle value, booking timing and history.
            </p>
            <Button onClick={run} loading={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Run AI Risk Check
            </Button>
          </>
        )}
        <p className="text-[11px] text-slate-400">
          AI guidance only — use your own judgement before approving a booking.
        </p>
      </CardBody>
    </Card>
  );
}
