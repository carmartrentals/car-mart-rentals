import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, FileText, ReceiptText, CheckCircle2, Car, CalendarRange,
} from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { ReservationActions } from "@/components/account/reservation-actions";
import { RESERVATION_STATUS, PAYMENT_STATUS, DEPOSIT_STATUS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  ReservationWithRelations, ReservationCharge, Deposit,
} from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function AccountReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const customer = await getCurrentCustomer();
  if (!customer) notFound();

  const admin = createAdminClient();
  const { data: resRow } = await admin
    .from("reservations")
    .select("*, vehicle:vehicles(*)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  const reservation = resRow as ReservationWithRelations | null;
  if (!reservation) notFound();

  const [{ data: chargeRows }, { data: depositRow }] = await Promise.all([
    admin.from("reservation_charges").select("*").eq("reservation_id", id).order("created_at"),
    admin
      .from("deposits")
      .select("*")
      .eq("reservation_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const charges = (chargeRows as ReservationCharge[]) ?? [];
  const deposit = (depositRow as Deposit | null) ?? null;

  const r = reservation;
  const v = r.vehicle;

  return (
    <>
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Reservations
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-bold text-slate-900">
            {r.reservation_number}
          </h1>
          <p className="text-sm text-slate-500">
            Booked {formatDateTime(r.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone={RESERVATION_STATUS[r.status].tone}>
            {RESERVATION_STATUS[r.status].label}
          </Badge>
          <Badge tone={PAYMENT_STATUS[r.payment_status].tone}>
            {PAYMENT_STATUS[r.payment_status].label}
          </Badge>
        </div>
      </div>

      {sp.paid === "1" && (
        <div className="mb-5">
          <Alert tone="success">
            Thank you — your payment was received. It may take a moment to
            reflect below.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Vehicle &amp; Rental Period</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Car className="h-4 w-4 text-gold-600" />
                {v ? `${v.year} ${v.make} ${v.model}` : "Vehicle"}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Pickup" value={formatDateTime(r.pickup_at)} />
                <Info label="Return" value={formatDateTime(r.return_at)} />
                <Info label="Duration" value={`${r.rental_days} day(s)`} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Charges</CardTitle></CardHeader>
            {charges.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-400">No line items recorded.</p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Description</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {charges.map((c) => (
                    <TR key={c.id}>
                      <TD className="text-slate-700">{c.description}</TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(c.amount)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <a
                href={`/api/admin/documents/agreement/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:border-gold-400"
              >
                <FileText className="h-4 w-4 text-gold-600" /> Rental Agreement (PDF)
              </a>
              <a
                href={`/api/admin/documents/invoice/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:border-gold-400"
              >
                <ReceiptText className="h-4 w-4 text-gold-600" /> Invoice (PDF)
              </a>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Row label="Total" value={formatCurrency(r.total)} />
              <Row label="Amount Paid" value={formatCurrency(r.amount_paid)} />
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                <span>Balance Due</span>
                <span className={r.balance_due > 0 ? "text-rose-600" : "text-emerald-600"}>
                  {formatCurrency(r.balance_due)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Security Deposit</span>
                {deposit ? (
                  <Badge tone={DEPOSIT_STATUS[deposit.status].tone}>
                    {DEPOSIT_STATUS[deposit.status].label}
                  </Badge>
                ) : (
                  <span className="text-slate-400">
                    {formatCurrency(r.deposit_amount)}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardBody>
              <ReservationActions
                reservationId={r.id}
                balanceDue={r.balance_due}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-400">
        <CalendarRange className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
