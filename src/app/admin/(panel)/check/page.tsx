import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

export default async function CheckPage() {
  let pickups: ReservationWithRelations[] = [];
  let returns: ReservationWithRelations[] = [];

  try {
    const admin = createAdminClient();
    const [p, r] = await Promise.all([
      admin
        .from("reservations")
        .select("*, customer:customers(*), vehicle:vehicles(*)")
        .eq("status", "confirmed")
        .order("pickup_at")
        .limit(20),
      admin
        .from("reservations")
        .select("*, customer:customers(*), vehicle:vehicles(*)")
        .in("status", ["active", "overdue"])
        .order("return_at")
        .limit(20),
    ]);
    pickups = (p.data as ReservationWithRelations[]) ?? [];
    returns = (r.data as ReservationWithRelations[]) ?? [];
  } catch {
    /* not configured */
  }

  return (
    <>
      <PageHeader
        title="Check-in / Check-out"
        subtitle="Vehicle inspections, photos, signatures and rental agreements."
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Awaiting Check-out</CardTitle></CardHeader>
          <CardBody className="p-0">
            {pickups.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No confirmed reservations awaiting pickup.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pickups.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/check/${r.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.customer
                            ? `${r.customer.first_name} ${r.customer.last_name}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.vehicle
                            ? `${r.vehicle.make} ${r.vehicle.model}`
                            : "—"}{" "}
                          · {formatDateTime(r.pickup_at)}
                        </p>
                      </div>
                      <Badge tone="green">Start Check-out</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Awaiting Check-in</CardTitle></CardHeader>
          <CardBody className="p-0">
            {returns.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No active rentals awaiting return.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {returns.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/check/${r.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.customer
                            ? `${r.customer.first_name} ${r.customer.last_name}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.vehicle
                            ? `${r.vehicle.make} ${r.vehicle.model}`
                            : "—"}{" "}
                          · due {formatDateTime(r.return_at)}
                        </p>
                      </div>
                      <Badge tone={r.status === "overdue" ? "red" : "amber"}>
                        {r.status === "overdue" ? "Overdue — Check-in" : "Start Check-in"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="text-sm text-slate-500">
          Select a reservation above to start its guided inspection. Check-out
          captures the driver license, odometer, fuel level, photos, damage and
          signatures, then generates the rental agreement. Check-in records the
          return condition, calculates excess mileage and fees, and produces the
          final invoice.
        </CardBody>
      </Card>
    </>
  );
}
