"use client";

import { useTransition } from "react";
import { Check, X, Play, Flag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setReservationStatus } from "@/app/admin/(panel)/reservations/actions";
import type { ReservationStatus } from "@/lib/types/database";

const FLOW: Record<
  ReservationStatus,
  { to: ReservationStatus; label: string; icon: typeof Check; variant: "primary" | "secondary" | "danger" }[]
> = {
  quote: [
    { to: "pending", label: "Mark Pending", icon: Flag, variant: "secondary" },
    { to: "confirmed", label: "Confirm", icon: Check, variant: "primary" },
  ],
  pending: [
    { to: "confirmed", label: "Confirm", icon: Check, variant: "primary" },
    { to: "cancelled", label: "Cancel", icon: X, variant: "danger" },
  ],
  confirmed: [
    { to: "active", label: "Activate Rental", icon: Play, variant: "primary" },
    { to: "no_show", label: "No-Show", icon: Ban, variant: "danger" },
  ],
  active: [
    { to: "completed", label: "Complete Rental", icon: Flag, variant: "primary" },
    { to: "overdue", label: "Mark Overdue", icon: Flag, variant: "secondary" },
  ],
  overdue: [
    { to: "completed", label: "Complete Rental", icon: Flag, variant: "primary" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function ReservationStatusActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: ReservationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const actions = FLOW[status] ?? [];

  if (actions.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No further status actions available.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.to}
          size="sm"
          variant={a.variant}
          loading={pending}
          onClick={() =>
            startTransition(() => setReservationStatus(reservationId, a.to))
          }
        >
          <a.icon className="h-4 w-4" />
          {a.label}
        </Button>
      ))}
    </div>
  );
}
