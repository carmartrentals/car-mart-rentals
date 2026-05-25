import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrecheckinFlow } from "@/components/account/precheckin-flow";
import type {
  ReservationWithRelations, AgreementSection,
} from "@/lib/types/database";

export default async function PrecheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  // Customer clicked the emailed pre-check-in link without being signed in.
  // Send them to the login page with a redirect back here so they land on
  // the right reservation after authenticating — never show a 404 for the
  // happy-path "I clicked my email link" case.
  if (!customer) {
    redirect(
      `/account/login?redirect=${encodeURIComponent(
        `/account/reservations/${id}/check-in`,
      )}`,
    );
  }

  const admin = createAdminClient();
  const { data: resRow } = await admin
    .from("reservations")
    .select("*, vehicle:vehicles(*)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  const reservation = resRow as ReservationWithRelations | null;
  if (!reservation) notFound();

  let agreementName = "Rental Agreement";
  let agreementSections: AgreementSection[] = [];
  try {
    const { data: tpl } = await admin
      .from("agreement_templates")
      .select("name, sections")
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();
    if (tpl) {
      agreementName = (tpl.name as string) || agreementName;
      agreementSections = (tpl.sections as AgreementSection[]) ?? [];
    }
  } catch {
    /* template optional */
  }

  const { data: depRow } = await admin
    .from("deposits")
    .select("status")
    .eq("reservation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const depositAuthorized =
    (depRow as { status?: string } | null)?.status === "authorized";

  const v = reservation.vehicle;
  const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : "your vehicle";

  return (
    <>
      <Link
        href={`/account/reservations/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservation
      </Link>

      <h1 className="heading-display text-2xl font-bold text-white">
        Online Pre-Check-In
      </h1>
      <p className="mt-0.5 text-sm text-slate-400">
        Take care of the paperwork now so your pickup takes just minutes.
      </p>

      <PrecheckinFlow
        reservationId={id}
        reservationNumber={reservation.reservation_number}
        vehicleName={vehicleName}
        pickupAt={reservation.pickup_at}
        customerName={`${customer.first_name} ${customer.last_name}`}
        dlStatus={customer.dl_status}
        insuranceStatus={customer.insurance_status}
        insuranceRequired={reservation.insurance_required}
        balanceDue={Number(reservation.balance_due ?? 0)}
        depositAmount={Number(reservation.deposit_amount ?? 0)}
        depositAuthorized={depositAuthorized}
        agreementName={agreementName}
        agreementSections={agreementSections}
        completedAt={reservation.precheckin_completed_at}
      />
    </>
  );
}
