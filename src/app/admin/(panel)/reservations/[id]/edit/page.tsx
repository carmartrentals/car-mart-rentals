import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ReservationForm } from "@/components/admin/reservation-form";
import { getTaxRate } from "@/lib/data/settings";
import { updateReservation } from "../../actions";
import type { Customer, Vehicle, Reservation } from "@/lib/types/database";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let reservation: Reservation | null = null;
  let customers: Customer[] = [];
  let vehicles: Vehicle[] = [];
  let taxRate = 0;

  try {
    const admin = createAdminClient();
    const [r, c, v] = await Promise.all([
      admin.from("reservations").select("*").eq("id", id).maybeSingle(),
      admin.from("customers").select("*").order("last_name").limit(500),
      admin.from("vehicles").select("*").neq("status", "inactive").order("make"),
    ]);
    reservation = r.data as Reservation | null;
    customers = (c.data as Customer[]) ?? [];
    vehicles = (v.data as Vehicle[]) ?? [];
    taxRate = await getTaxRate();
  } catch {
    notFound();
  }
  if (!reservation) notFound();

  const action = updateReservation.bind(null, id);

  return (
    <>
      <Link
        href={`/admin/reservations/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservation
      </Link>
      <PageHeader
        title={`Edit ${reservation.reservation_number}`}
        subtitle="Update reservation details, pricing and status."
      />
      <ReservationForm
        action={action}
        customers={customers}
        vehicles={vehicles}
        taxRate={taxRate}
        reservation={reservation}
      />
    </>
  );
}
