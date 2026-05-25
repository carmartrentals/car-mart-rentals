import Link from "next/link";
import Image from "next/image";
import { CalendarRange, ArrowRight, CarFront, ShieldAlert } from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

export default async function AccountDashboard() {
  const customer = await getCurrentCustomer();

  let reservations: ReservationWithRelations[] = [];
  if (customer) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("reservations")
        .select("*, vehicle:vehicles(*)")
        .eq("customer_id", customer.id)
        .order("pickup_at", { ascending: false });
      reservations = (data as ReservationWithRelations[]) ?? [];
    } catch {
      /* ignore */
    }
  }

  const upcoming = reservations.filter((r) =>
    ["quote", "pending", "confirmed", "active", "overdue"].includes(r.status),
  );
  const past = reservations.filter((r) =>
    ["completed", "cancelled", "no_show"].includes(r.status),
  );

  return (
    <>
      <div className="mb-7">
        <p className="eyebrow">Customer Portal</p>
        <h1 className="heading-display mt-2 text-3xl font-bold text-white">
          Welcome back, {customer?.first_name}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          View your reservations, pay balances and download documents.
        </p>
      </div>

      {/* Nudge customers without a license on file — booking is gated on it. */}
      {customer && !customer.dl_front_url && (
        <Link
          href="/account/onboarding"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 transition-colors hover:border-amber-400/50 hover:bg-amber-500/15"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-100">
              Complete your profile to book
            </p>
            <p className="mt-0.5 text-sm text-amber-200/80">
              Upload your driver license so we can verify you before pickup.
              Takes about 60 seconds.
            </p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 text-amber-200" />
        </Link>
      )}

      {reservations.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <CarFront className="h-6 w-6 text-gold-300" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-white">
            No reservations yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            When you book a vehicle it will appear here.
          </p>
          <Link
            href="/vehicles"
            className="mt-5 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
          >
            Browse Our Fleet
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Current & Upcoming" reservations={upcoming} />
          )}
          {past.length > 0 && (
            <Section title="Past Rentals" reservations={past} />
          )}
        </div>
      )}
    </>
  );
}

function Section({
  title,
  reservations,
}: {
  title: string;
  reservations: ReservationWithRelations[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {reservations.map((r) => (
          <Link
            key={r.id}
            href={`/account/reservations/${r.id}`}
            className="group flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06] hover:shadow-glow"
          >
            <div className="relative w-28 shrink-0 bg-brand-900">
              {r.vehicle?.main_image_url && (
                <Image
                  src={r.vehicle.main_image_url}
                  alt={r.vehicle.model}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {r.vehicle
                    ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                    : "Vehicle"}
                </p>
                <Badge tone={RESERVATION_STATUS[r.status].tone}>
                  {RESERVATION_STATUS[r.status].label}
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarRange className="h-3.5 w-3.5" />
                {formatDateTime(r.pickup_at)}
              </p>
              <p className="text-xs text-slate-500">{r.reservation_number}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-sm">
                  {r.balance_due > 0 ? (
                    <span className="font-semibold text-rose-400">
                      {formatCurrency(r.balance_due)} due
                    </span>
                  ) : (
                    <Badge tone={PAYMENT_STATUS[r.payment_status].tone}>
                      {PAYMENT_STATUS[r.payment_status].label}
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gold-300">
                  Details <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
