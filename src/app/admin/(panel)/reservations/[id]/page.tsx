import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Pencil, User, Car, CalendarRange, FileText, CreditCard,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ReservationStatusActions } from "@/components/admin/reservation-status-actions";
import { PaymentManager } from "@/components/admin/payment-manager";
import { RequestPanel } from "@/components/admin/request-panel";
import {
  RESERVATION_STATUS, PAYMENT_STATUS, RESERVATION_SOURCES,
} from "@/lib/constants";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import type {
  ReservationWithRelations, ReservationCharge, Payment, Deposit,
  ReservationRequest,
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

  const r = reservation;
  const customer = r.customer;
  const vehicle = r.vehicle;

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
          <RequestPanel requests={requests} reservationId={r.id} />

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
