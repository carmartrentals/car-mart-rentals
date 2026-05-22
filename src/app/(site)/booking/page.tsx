import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVehicleBySlug } from "@/lib/data/vehicles";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCustomer } from "@/lib/account";
import { BookingForm } from "@/components/site/booking-form";
import type { AddOn } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Complete Your Reservation",
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

  const supabase = await createClient();
  const { data } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const addOns = (data as AddOn[]) ?? [];

  // Pre-fill driver details for a signed-in customer.
  const customer = await getCurrentCustomer();
  const prefill = customer
    ? {
        first_name: customer.first_name ?? "",
        last_name: customer.last_name ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        dl_number: customer.dl_number ?? "",
        dl_state: customer.dl_state ?? "",
      }
    : null;

  return (
    <div className="bg-brand-950">
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
        />
      </div>
    </div>
  );
}
