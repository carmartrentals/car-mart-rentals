import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckWorkflow } from "@/components/admin/check-workflow";
import { RESERVATION_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { ReservationWithRelations, Inspection } from "@/lib/types/database";

export default async function CheckWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let reservation: ReservationWithRelations | null = null;
  let inspections: Inspection[] = [];
  try {
    const admin = createAdminClient();
    const { data: resRow } = await admin
      .from("reservations")
      .select("*, customer:customers(*), vehicle:vehicles(*)")
      .eq("id", id)
      .maybeSingle();
    reservation = resRow as ReservationWithRelations | null;
    if (reservation) {
      const { data: insp } = await admin
        .from("inspections")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at");
      inspections = (insp as Inspection[]) ?? [];
    }
  } catch {
    notFound();
  }
  if (!reservation) notFound();

  const r = reservation;
  const customer = r.customer;
  const vehicle = r.vehicle;
  const checkoutInsp = inspections.find((i) => i.inspection_type === "checkout");

  const mode: "checkout" | "checkin" | null =
    ["confirmed", "pending"].includes(r.status)
      ? "checkout"
      : ["active", "overdue"].includes(r.status)
        ? "checkin"
        : null;

  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : "—";
  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "—";

  return (
    <>
      <Link
        href={`/admin/reservations/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservation
      </Link>

      <PageHeader
        title={
          mode === "checkout"
            ? "Vehicle Check-out"
            : mode === "checkin"
              ? "Vehicle Check-in"
              : "Check-in / Check-out"
        }
        subtitle={`${r.reservation_number} · ${customerName} · ${vehicleName}`}
      />

      {/* Reservation summary strip */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Summary label="Status">
            <Badge tone={RESERVATION_STATUS[r.status].tone}>
              {RESERVATION_STATUS[r.status].label}
            </Badge>
          </Summary>
          <Summary label="Pickup">{formatDateTime(r.pickup_at)}</Summary>
          <Summary label="Return">{formatDateTime(r.return_at)}</Summary>
          <Summary label="Duration">{r.rental_days} day(s)</Summary>
          <Summary label="Vehicle">
            {vehicle?.license_plate || "No plate"}
          </Summary>
        </CardBody>
      </Card>

      {mode ? (
        <CheckWorkflow
          mode={mode}
          reservationId={r.id}
          reservationNumber={r.reservation_number}
          customerName={customerName}
          vehicleName={vehicleName}
          vehicleLabel={`${vehicle?.license_plate ?? ""} ${vehicle?.color ?? ""}`.trim()}
          licenseInfo={
            customer?.dl_number
              ? `License ${customer.dl_number}${
                  customer.dl_state ? ` (${customer.dl_state})` : ""
                }${customer.dl_expiration ? ` · expires ${customer.dl_expiration}` : ""}`
              : "No driver license on file — verify a physical license."
          }
          rentalDays={r.rental_days}
          mileageLimitPerDay={vehicle?.mileage_limit ?? 0}
          extraMileageFee={vehicle?.extra_mileage_fee ?? 0}
          baselineOdometer={checkoutInsp?.odometer ?? vehicle?.odometer ?? 0}
        />
      ) : (
        <Card>
          <CardBody className="flex flex-col items-center px-6 py-12 text-center">
            {r.status === "completed" ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  Rental Completed
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  This rental has been checked in and completed. Check-out and
                  check-in inspections are recorded below.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  Not Ready for Check-out
                </h2>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  This reservation is <strong>{r.status}</strong>. A reservation
                  must be <strong>confirmed</strong> before check-out, or{" "}
                  <strong>active</strong> before check-in.
                </p>
              </>
            )}
            <Link href={`/admin/reservations/${id}`} className="mt-5">
              <Button variant="outline">Go to Reservation</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Completed inspection history */}
      {inspections.length > 0 && mode === null && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {inspections.map((insp) => (
            <Card key={insp.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {insp.inspection_type === "checkout"
                      ? "Check-out Inspection"
                      : "Check-in Inspection"}
                  </h3>
                  <Badge tone={insp.inspection_type === "checkout" ? "blue" : "green"}>
                    {insp.completed_at ? formatDateTime(insp.completed_at) : "—"}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Odometer</dt>
                    <dd className="font-medium">
                      {insp.odometer?.toLocaleString() ?? "—"} mi
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Fuel / Battery</dt>
                    <dd className="font-medium">{insp.fuel_level ?? "—"}%</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Summary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}
