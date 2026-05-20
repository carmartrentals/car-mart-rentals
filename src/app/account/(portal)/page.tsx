import Link from "next/link";
import Image from "next/image";
import { CalendarRange, ArrowRight, CarFront } from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
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
      <div className="mb-6">
        <h1 className="heading-display text-2xl font-bold text-slate-900">
          Welcome back, {customer?.first_name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          View your reservations, pay balances and download documents.
        </p>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={CarFront}
            title="No reservations yet"
            description="When you book a vehicle it will appear here."
            action={
              <Link
                href="/vehicles"
                className="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 hover:bg-gold-400"
              >
                Browse Our Fleet
              </Link>
            }
          />
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {reservations.map((r) => (
          <Link
            key={r.id}
            href={`/account/reservations/${r.id}`}
            className="group flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-all hover:shadow-elevated"
          >
            <div className="relative w-28 shrink-0 bg-slate-100">
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
                <p className="text-sm font-semibold text-slate-900">
                  {r.vehicle
                    ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                    : "Vehicle"}
                </p>
                <Badge tone={RESERVATION_STATUS[r.status].tone}>
                  {RESERVATION_STATUS[r.status].label}
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarRange className="h-3.5 w-3.5" />
                {formatDateTime(r.pickup_at)}
              </p>
              <p className="text-xs text-slate-400">{r.reservation_number}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-sm">
                  {r.balance_due > 0 ? (
                    <span className="font-semibold text-rose-600">
                      {formatCurrency(r.balance_due)} due
                    </span>
                  ) : (
                    <Badge tone={PAYMENT_STATUS[r.payment_status].tone}>
                      {PAYMENT_STATUS[r.payment_status].label}
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gold-700">
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
