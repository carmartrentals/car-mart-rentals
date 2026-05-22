import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Pencil, User, Car, CalendarRange, FileText, CreditCard,
  ShieldCheck, ShieldAlert, AlertTriangle, Camera, Siren, Mail, Activity,
  CheckCircle2, ClipboardCheck,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTaxRate } from "@/lib/data/settings";
import { projectReservationChange } from "@/lib/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ReservationStatusActions } from "@/components/admin/reservation-status-actions";
import { PaymentManager } from "@/components/admin/payment-manager";
import { RequestPanel } from "@/components/admin/request-panel";
import { InsuranceRequiredToggle } from "@/components/admin/insurance-required-toggle";
import { RiskPanel } from "@/components/admin/risk-panel";
import {
  DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, isExpired,
} from "@/lib/documents";
import {
  RESERVATION_STATUS, PAYMENT_STATUS, RESERVATION_SOURCES,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import type {
  ReservationWithRelations, ReservationCharge, Payment, Deposit,
  ReservationRequest, Inspection, InspectionPhoto, TollViolation,
  Notification, ActivityLog,
} from "@/lib/types/database";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let reservation: ReservationWithRelations | null = null;
  let charges: ReservationCharge[] = [];
  let payments: Payment[] = [];
  let deposit: Deposit | null = null;

  try {
    const admin = createAdminClient();
    const [r, ch, pay, dep] = await Promise.all([
      admin
        .from("reservations")
        .select("*, customer:customers(*), vehicle:vehicles(*)")
        .eq("id", id)
        .maybeSingle(),
      admin
        .from("reservation_charges")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at"),
      admin
        .from("payments")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("deposits")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    reservation = r.data as ReservationWithRelations | null;
    charges = (ch.data as ReservationCharge[]) ?? [];
    payments = (pay.data as Payment[]) ?? [];
    deposit = (dep.data as Deposit | null) ?? null;
  } catch {
    notFound();
  }
  if (!reservation) notFound();

  // Customer requests — queried separately so a pre-0011 database still works.
  let requests: ReservationRequest[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("reservation_requests")
      .select("*")
      .eq("reservation_id", id)
      .order("created_at", { ascending: false });
    requests = (data as ReservationRequest[]) ?? [];
  } catch {
    /* table not migrated yet — ignore */
  }

  // Inspections, activity, tolls and email history for this reservation —
  // queried in a resilient block so a problem with one never breaks the page.
  let inspections: (Inspection & { photos: InspectionPhoto[] })[] = [];
  let activity: (ActivityLog & {
    user: { full_name: string; email: string } | null;
  })[] = [];
  let tolls: TollViolation[] = [];
  let emails: Notification[] = [];
  try {
    const admin = createAdminClient();
    const [insRes, actRes, tollRes, mailRes] = await Promise.all([
      admin
        .from("inspections")
        .select("*, photos:inspection_photos(*)")
        .eq("reservation_id", id)
        .order("created_at"),
      admin
        .from("activity_logs")
        .select("*, user:users(full_name,email)")
        .eq("entity_type", "reservation")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(60),
      admin
        .from("toll_violations")
        .select("*")
        .eq("reservation_id", id)
        .order("incurred_date", { ascending: false }),
      admin
        .from("notifications")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false }),
    ]);
    inspections =
      (insRes.data as unknown as (Inspection & {
        photos: InspectionPhoto[];
      })[]) ?? [];
    activity =
      (actRes.data as unknown as (ActivityLog & {
        user: { full_name: string; email: string } | null;
      })[]) ?? [];
    tolls = (tollRes.data as TollViolation[]) ?? [];
    emails = (mailRes.data as Notification[]) ?? [];
  } catch {
    /* ignore — sections simply render empty */
  }

  const r = reservation;
  const customer = r.customer;
  const vehicle = r.vehicle;

  // Document-verification readiness for check-out.
  const dlExpired = isExpired(customer?.dl_expiration);
  const insExpired = isExpired(customer?.insurance_expiration);
  const dlVerified = customer?.dl_status === "verified" && !dlExpired;
  const insVerified =
    customer?.insurance_status === "verified" && !insExpired;
  const pickupReady =
    !!customer && dlVerified && (!r.insurance_required || insVerified);

  // Project the financial impact of each pending request so staff can see
  // exactly how much more (or less) they'll collect before approving.
  const taxRate = await getTaxRate();
  const projections: Record<
    string,
    { newDays: number; total: number; balanceDue: number; delta: number }
  > = {};
  for (const req of requests) {
    if (req.status === "pending" && req.requested_at) {
      const p = projectReservationChange({
        pickupAt: r.pickup_at,
        newReturnAt: req.requested_at,
        rateAmount: r.rate_amount,
        addonsTotal: r.addons_total,
        feesTotal: r.fees_total,
        discountAmount: r.discount_amount,
        amountPaid: r.amount_paid,
        taxRatePercent: taxRate,
      });
      projections[req.id] = {
        newDays: p.newDays,
        total: p.total,
        balanceDue: p.balanceDue,
        delta: Math.round((p.total - r.total) * 100) / 100,
      };
    }
  }

  return (
    <>
      <Link
        href="/admin/reservations"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservations
      </Link>

      <PageHeader
        title={r.reservation_number}
        subtitle={`${RESERVATION_SOURCES[r.source]} reservation · created ${formatDateTime(r.created_at)}`}
        actions={
          <>
            <Link href={`/admin/check/${r.id}`}>
              <Button variant="secondary">Check-in / Check-out</Button>
            </Link>
            <Link href={`/admin/reservations/${r.id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* CUSTOMER REQUESTS — extension / early return */}
          <RequestPanel
            requests={requests}
            reservationId={r.id}
            currentTotal={r.total}
            currentDays={r.rental_days}
            projections={projections}
          />

          {/* STATUS */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Workflow</CardTitle>
              <div className="flex gap-2">
                <Badge tone={RESERVATION_STATUS[r.status].tone}>
                  {RESERVATION_STATUS[r.status].label}
                </Badge>
                <Badge tone={PAYMENT_STATUS[r.payment_status].tone}>
                  {PAYMENT_STATUS[r.payment_status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <ReservationStatusActions reservationId={r.id} status={r.status} />
            </CardBody>
          </Card>

          {/* CUSTOMER + VEHICLE */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
              <CardBody>
                {customer ? (
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="block space-y-1"
                  >
                    <p className="flex items-center gap-2 font-medium text-gold-700">
                      <User className="h-4 w-4" />
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-sm text-slate-600">{customer.email}</p>
                    <p className="text-sm text-slate-600">{customer.phone || "—"}</p>
                  </Link>
                ) : (
                  <p className="text-sm text-slate-400">No customer assigned.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
              <CardBody>
                {vehicle ? (
                  <Link
                    href={`/admin/vehicles/${vehicle.id}`}
                    className="block space-y-1"
                  >
                    <p className="flex items-center gap-2 font-medium text-gold-700">
                      <Car className="h-4 w-4" />
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-slate-600">
                      {vehicle.license_plate || "No plate"} · {vehicle.color}
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-slate-400">No vehicle assigned.</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* AI RISK CHECK */}
          <RiskPanel
            reservationId={r.id}
            level={r.risk_level}
            summary={r.risk_summary}
            assessedAt={r.risk_assessed_at}
          />

          {/* CUSTOMER DOCUMENTS & VERIFICATION */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold-600" />
                  Documents & Verification
                </span>
              </CardTitle>
              {customer && (
                <Badge tone={pickupReady ? "green" : "amber"}>
                  {pickupReady ? "Ready for pickup" : "Pickup blocked"}
                </Badge>
              )}
            </CardHeader>
            <CardBody className="space-y-4">
              {customer ? (
                <>
                  {/* Readiness banner */}
                  {pickupReady ? (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        All required documents are verified — this rental can be
                        checked out.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Check-out is blocked until the required documents are
                        verified.{" "}
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-semibold underline"
                        >
                          Review &amp; verify on the customer&apos;s profile →
                        </Link>
                      </span>
                    </div>
                  )}

                  {/* Driver license */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        Driver License
                      </p>
                      <Badge tone={DOCUMENT_STATUS_TONE[customer.dl_status]}>
                        {DOCUMENT_STATUS_LABEL[customer.dl_status]}
                      </Badge>
                    </div>
                    {dlExpired && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> License has
                        expired
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DocThumb
                        label="License — Front"
                        url={customer.dl_front_url}
                      />
                      <DocThumb
                        label="License — Back"
                        url={customer.dl_back_url}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Info
                        icon={CreditCard}
                        label="License #"
                        value={customer.dl_number || "—"}
                      />
                      <Info
                        icon={CreditCard}
                        label="State"
                        value={customer.dl_state || "—"}
                      />
                      <Info
                        icon={CalendarRange}
                        label="Expires"
                        value={
                          customer.dl_expiration
                            ? formatDate(customer.dl_expiration)
                            : "—"
                        }
                      />
                    </div>
                  </div>

                  {/* Insurance */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        Proof of Insurance
                      </p>
                      <Badge
                        tone={DOCUMENT_STATUS_TONE[customer.insurance_status]}
                      >
                        {DOCUMENT_STATUS_LABEL[customer.insurance_status]}
                      </Badge>
                    </div>
                    {insExpired && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Insurance has
                        expired
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DocThumb
                        label="Insurance Document"
                        url={customer.insurance_doc_url}
                      />
                      <div className="grid content-start gap-3">
                        <Info
                          icon={FileText}
                          label="Company"
                          value={customer.insurance_company || "—"}
                        />
                        <Info
                          icon={CreditCard}
                          label="Policy #"
                          value={customer.insurance_policy_no || "—"}
                        />
                        <Info
                          icon={CalendarRange}
                          label="Expires"
                          value={
                            customer.insurance_expiration
                              ? formatDate(customer.insurance_expiration)
                              : "—"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Per-reservation insurance requirement */}
                  <div className="border-t border-slate-100 pt-4">
                    <InsuranceRequiredToggle
                      reservationId={r.id}
                      required={r.insurance_required}
                    />
                  </div>

                  {/* Online pre-check-in status */}
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <ClipboardCheck className="h-4 w-4 text-gold-600" /> Online
                      Pre-Check-In
                    </p>
                    {r.precheckin_completed_at ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Completed{" "}
                          {formatDateTime(r.precheckin_completed_at)}
                        </span>
                        {r.precheckin_signature_url && (
                          <a
                            href={r.precheckin_signature_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                          >
                            View signature
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Not completed yet — the customer can pre-check-in from
                        their account.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  No customer assigned to this reservation.
                </p>
              )}
            </CardBody>
          </Card>

          {/* PERIOD */}
          <Card>
            <CardHeader><CardTitle>Rental Period</CardTitle></CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <Info icon={CalendarRange} label="Pickup" value={formatDateTime(r.pickup_at)} />
              <Info icon={CalendarRange} label="Return" value={formatDateTime(r.return_at)} />
              <Info icon={CalendarRange} label="Duration" value={`${r.rental_days} day(s)`} />
            </CardBody>
          </Card>

          {/* CHARGES */}
          <Card>
            <CardHeader>
              <CardTitle>Charges</CardTitle>
            </CardHeader>
            {charges.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">No line items recorded.</p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Description</TH>
                    <TH>Type</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Unit</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {charges.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium text-slate-800">{c.description}</TD>
                      <TD className="text-slate-500">{titleCase(c.charge_type)}</TD>
                      <TD className="text-right">{c.quantity}</TD>
                      <TD className="text-right">{formatCurrency(c.unit_price)}</TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(c.amount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          {/* PAYMENTS & DEPOSIT */}
          <PaymentManager
            reservationId={r.id}
            balanceDue={r.balance_due}
            depositAmount={r.deposit_amount}
            payments={payments}
            deposit={deposit}
          />

          {(r.notes || r.internal_notes) && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {r.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Customer Notes
                    </p>
                    <p className="text-sm text-slate-600">{r.notes}</p>
                  </div>
                )}
                {r.internal_notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Internal Notes
                    </p>
                    <p className="text-sm text-slate-600">{r.internal_notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* VEHICLE INSPECTIONS */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-gold-600" /> Vehicle Inspections
                </span>
              </CardTitle>
            </CardHeader>
            {inspections.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">
                  No inspections yet — they appear after check-out and check-in.
                </p>
              </CardBody>
            ) : (
              <CardBody className="space-y-4">
                {inspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {insp.inspection_type === "checkout"
                          ? "Check-out Inspection"
                          : "Check-in Inspection"}
                      </p>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(insp.completed_at ?? insp.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                      <span>
                        Odometer:{" "}
                        <strong className="text-slate-800">
                          {insp.odometer != null
                            ? `${insp.odometer.toLocaleString()} mi`
                            : "—"}
                        </strong>
                      </span>
                      <span>
                        Fuel:{" "}
                        <strong className="text-slate-800">
                          {insp.fuel_level != null ? `${insp.fuel_level}%` : "—"}
                        </strong>
                      </span>
                      <span>
                        Exterior:{" "}
                        <strong className="text-slate-800">
                          {insp.exterior_clean ? "Clean" : "Not clean"}
                        </strong>
                      </span>
                      <span>
                        Interior:{" "}
                        <strong className="text-slate-800">
                          {insp.interior_clean ? "Clean" : "Not clean"}
                        </strong>
                      </span>
                    </div>
                    {insp.notes && (
                      <p className="mt-2 text-sm text-slate-500">{insp.notes}</p>
                    )}
                    {insp.photos.length > 0 && (
                      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {insp.photos.map((ph) => (
                          <a
                            key={ph.id}
                            href={ph.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square overflow-hidden rounded-md border border-slate-200 transition-colors hover:border-gold-400"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ph.url}
                              alt={ph.category}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardBody>
            )}
          </Card>

          {/* TOLLS & VIOLATIONS */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Siren className="h-4 w-4 text-gold-600" /> Tolls & Violations
                </span>
              </CardTitle>
            </CardHeader>
            {tolls.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">
                  No tolls or violations recorded for this rental.
                </p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Type</TH>
                    <TH>Date</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {tolls.map((t) => (
                    <TR key={t.id}>
                      <TD className="text-slate-800">
                        <p className="font-medium">
                          {titleCase(t.violation_type)}
                        </p>
                        {t.description && (
                          <p className="text-xs text-slate-400">
                            {t.description}
                          </p>
                        )}
                      </TD>
                      <TD className="text-slate-500">
                        {formatDate(t.incurred_date)}
                      </TD>
                      <TD>
                        <Badge
                          tone={
                            t.status === "paid"
                              ? "green"
                              : t.status === "charged_to_customer"
                                ? "blue"
                                : t.status === "waived"
                                  ? "gray"
                                  : "amber"
                          }
                        >
                          {titleCase(t.status)}
                        </Badge>
                      </TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(t.amount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          {/* EMAIL HISTORY */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gold-600" /> Email History
                </span>
              </CardTitle>
            </CardHeader>
            {emails.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">
                  No emails have been sent for this reservation yet.
                </p>
              </CardBody>
            ) : (
              <CardBody className="p-0">
                <ul className="divide-y divide-slate-100">
                  {emails.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {e.subject || titleCase(e.type.replace(/_/g, " "))}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          To {e.recipient} ·{" "}
                          {formatDateTime(e.sent_at ?? e.created_at)}
                        </p>
                      </div>
                      <Badge
                        tone={
                          e.status === "sent"
                            ? "green"
                            : e.status === "failed"
                              ? "red"
                              : "amber"
                        }
                      >
                        {titleCase(e.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            )}
          </Card>

          {/* ACTIVITY TIMELINE */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gold-600" /> Activity Timeline
                </span>
              </CardTitle>
            </CardHeader>
            {activity.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">
                  No activity recorded for this reservation yet.
                </p>
              </CardBody>
            ) : (
              <CardBody className="p-0">
                <ul className="divide-y divide-slate-100">
                  {activity.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-start gap-3 px-5 py-3"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">
                          {log.description ||
                            titleCase(log.action.replace(/[._]/g, " "))}
                        </p>
                        <p className="text-xs text-slate-400">
                          {log.user?.full_name || log.user?.email || "System"} ·{" "}
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            )}
          </Card>
        </div>

        {/* SIDEBAR: financial summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Line label="Subtotal" value={formatCurrency(r.subtotal)} />
              {r.addons_total > 0 && (
                <Line label="Add-ons" value={formatCurrency(r.addons_total)} />
              )}
              {r.fees_total > 0 && (
                <Line label="Fees" value={formatCurrency(r.fees_total)} />
              )}
              {r.discount_amount > 0 && (
                <Line label="Discount" value={`- ${formatCurrency(r.discount_amount)}`} />
              )}
              <Line label="Tax" value={formatCurrency(r.tax_amount)} />
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(r.total)}</span>
              </div>
              <Line label="Amount Paid" value={formatCurrency(r.amount_paid)} />
              <div className="flex justify-between font-semibold text-rose-600">
                <span>Balance Due</span>
                <span>{formatCurrency(r.balance_due)}</span>
              </div>
              <Line label="Security Deposit" value={formatCurrency(r.deposit_amount)} muted />
            </CardBody>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle>Documents (PDF)</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <a
                href={`/api/admin/documents/agreement/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:border-gold-400"
              >
                <FileText className="h-4 w-4 text-gold-600" /> Rental Agreement
              </a>
              <a
                href={`/api/admin/documents/invoice/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:border-gold-400"
              >
                <CreditCard className="h-4 w-4 text-gold-600" /> Invoice
              </a>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Line({
  label, value, muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className={muted ? "" : "font-medium text-slate-800"}>{value}</span>
    </div>
  );
}

function DocThumb({ label, url }: { label: string; url: string | null }) {
  const isPdf = !!url && url.toLowerCase().includes(".pdf");
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-gold-400"
        >
          {isPdf ? (
            <span className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-slate-50 text-slate-500">
              <FileText className="h-6 w-6" />
              <span className="text-xs font-medium">View PDF</span>
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt={label}
              className="aspect-[4/3] w-full object-cover"
            />
          )}
        </a>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
          Not uploaded
        </div>
      )}
    </div>
  );
}
