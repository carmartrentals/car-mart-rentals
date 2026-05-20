import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVehicleBySlug } from "@/lib/data/vehicles";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-brand-950 py-10">
        <div className="container-px">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
            Checkout
          </p>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white">
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
        />
      </div>
    </div>
  );
}
