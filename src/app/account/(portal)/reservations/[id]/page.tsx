import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, FileText, ReceiptText, Car, CalendarRange, Repeat,
} from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTaxRate } from "@/lib/data/settings";
import { Badge } from "@/components/ui/badge";
import { ReservationActions } from "@/components/account/reservation-actions";
import { LeaveReview } from "@/components/account/leave-review";
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

  const [{ data: chargeRows }, { data: depositRow }, { data: reviewRow }] =
    await Promise.all([
      admin.from("reservation_charges").select("*").eq("reservation_id", id).order("created_at"),
      admin
        .from("deposits")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("reviews")
        .select("rating,title,comment,is_published")
        .eq("reservation_id", id)
        .limit(1)
        .maybeSingle(),
    ]);
  const charges = (chargeRows as ReservationCharge[]) ?? [];
  const deposit = (depositRow as Deposit | null) ?? null;
  const review =
    (reviewRow as {
      rating: number;
      title: string | null;
      comment: string | null;
      is_published: boolean;
    } | null) ?? null;

  // Reservation requests — queried separately so a pre-0011 database still
  // renders the page.
  let requests: {
    request_type: "extension" | "early_return";
    status: "pending" | "approved" | "declined";
  }[] = [];
  try {
    const { data } = await admin
      .from("reservation_requests")
      .select("request_type,status")
      .eq("reservation_id", id)
      .order("created_at", { ascending: false });
    requests = (data as typeof requests) ?? [];
  } catch {
    /* table not migrated yet — ignore */
  }

  const taxRate = await getTaxRate();

  const r = reservation;
  const v = r.vehicle;

  return (
    <>
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Reservations
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-2xl font-bold text-white">
            {r.reservation_number}
          </h1>
          <p className="text-sm text-slate-400">
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
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Thank you — your payment was received. It may take a moment to reflect
          below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Vehicle & Rental Period">
            <div className="space-y-3 p-5">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <Car className="h-4 w-4 text-gold-300" />
                {v ? `${v.year} ${v.make} ${v.model}` : "Vehicle"}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Pickup" value={formatDateTime(r.pickup_at)} />
                <Info label="Return" value={formatDateTime(r.return_at)} />
                <Info label="Duration" value={`${r.rental_days} day(s)`} />
              </div>
            </div>
          </Panel>

          <Panel title="Charges">
            {charges.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                No line items recorded.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {charges.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between px-5 py-2.5 text-sm"
                  >
                    <span className="text-slate-300">{c.description}</span>
                    <span className="font-medium text-white">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Documents">
            <div className="space-y-2 p-5">
              <a
                href={`/api/admin/documents/agreement/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-white/25"
              >
                <FileText className="h-4 w-4 text-gold-300" /> Rental Agreement (PDF)
              </a>
              <a
                href={`/api/admin/documents/invoice/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-white/25"
              >
                <ReceiptText className="h-4 w-4 text-gold-300" /> Invoice (PDF)
              </a>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Payment Summary">
            <div className="space-y-2 p-5 text-sm">
              <Row label="Total" value={formatCurrency(r.total)} />
              <Row label="Amount Paid" value={formatCurrency(r.amount_paid)} />
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold">
                <span className="text-white">Balance Due</span>
                <span className={r.balance_due > 0 ? "text-rose-400" : "text-emerald-400"}>
                  {formatCurrency(r.balance_due)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Security Deposit</span>
                {deposit ? (
                  <Badge tone={DEPOSIT_STATUS[deposit.status].tone}>
                    {DEPOSIT_STATUS[deposit.status].label}
                  </Badge>
                ) : (
                  <span className="text-slate-500">
                    {formatCurrency(r.deposit_amount)}
                  </span>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Actions">
            <div className="space-y-3 p-5">
              <ReservationActions
                reservationId={r.id}
                balanceDue={r.balance_due}
                pickupAt={r.pickup_at}
                returnAt={r.return_at}
                rateAmount={r.rate_amount}
                taxRate={taxRate}
                requests={requests}
              />
              {v?.slug && (
                <Link
                  href={`/vehicles/${v.slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
                >
                  <Repeat className="h-4 w-4" /> Book This Vehicle Again
                </Link>
              )}
            </div>
          </Panel>

          {r.status === "completed" && (
            <Panel title="Your Feedback">
              <div className="p-5">
                <LeaveReview reservationId={r.id} existingReview={review} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <CalendarRange className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
