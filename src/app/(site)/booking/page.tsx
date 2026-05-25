import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVehicleBySlug } from "@/lib/data/vehicles";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCustomer } from "@/lib/account";
import { getTaxRate, getCancellationPolicy } from "@/lib/data/settings";
import { BookingForm } from "@/components/site/booking-form";
import { BookingStartedTracker } from "@/components/site/booking-started-tracker";
import type { AddOn } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Complete Your Reservation",
  // Transactional page — exclude from search results but allow link following.
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const slug = str(sp.vehicle);
  const pickup = str(sp.pickup);
  const ret = str(sp.return);

  if (!slug || !pickup || !ret) redirect("/vehicles");

  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) redirect("/vehicles");

  // Build the canonical "return to this exact booking" URL so we can route
  // visitors through login + onboarding and bring them back here.
  const refParam = str(sp.ref);
  const bookingPath = `/booking?vehicle=${encodeURIComponent(slug)}&pickup=${encodeURIComponent(pickup)}&return=${encodeURIComponent(ret)}${
    refParam ? `&ref=${encodeURIComponent(refParam)}` : ""
  }`;
  const redirectQs = `?redirect=${encodeURIComponent(bookingPath)}`;

  // GATE 1 — require sign-in. Anonymous bookings are no longer allowed so the
  // renter has a verified email + we can reach them after pickup.
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/account/login${redirectQs}`);

  // GATE 2 — require a driver license photo on file. Reduces verification
  // time at pickup and gives the AI license inspector something to analyze.
  if (!customer.dl_front_url) redirect(`/account/onboarding${redirectQs}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const addOns = (data as AddOn[]) ?? [];

  // Pulled from Settings -> Tax. Passed into the client form below so the
  // quote shown to the customer matches what the server actually charges.
  const taxRate = await getTaxRate();
  const cancellation = await getCancellationPolicy();

  // Customer's profile prefills the form (they're guaranteed signed in here).
  const prefill = {
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    dl_number: customer.dl_number ?? "",
    dl_state: customer.dl_state ?? "",
  };

  return (
    <div className="bg-brand-950">
      <BookingStartedTracker
        vehicleId={vehicle.id}
        vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      />
      <section className="relative overflow-hidden border-b border-white/10 bg-brand-950 py-12">
        <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-48" />
        <div className="container-px relative">
          <p className="eyebrow">Checkout</p>
          <h1 className="heading-display mt-2 text-3xl font-bold text-white sm:text-4xl">
            Complete Your Reservation
          </h1>
        </div>
      </section>

      <div className="container-px py-10">
        <BookingForm
          vehicle={vehicle}
          addOns={addOns}
          pickup={pickup as string}
          ret={ret as string}
          prefill={prefill}
          refCode={str(sp.ref) ?? null}
          taxRate={taxRate}
          cancellationHours={cancellation.window_hours}
        />
      </div>
    </div>
  );
}
