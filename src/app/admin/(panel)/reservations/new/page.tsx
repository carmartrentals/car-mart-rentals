import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ReservationForm } from "@/components/admin/reservation-form";
import { Alert } from "@/components/ui/misc";
import { getTaxRate } from "@/lib/data/settings";
import { createReservation } from "../actions";
import type { Customer, Vehicle } from "@/lib/types/database";

export default async function NewReservationPage() {
  let customers: Customer[] = [];
  let vehicles: Vehicle[] = [];
  let taxRate = 0;
  let configError = false;

  try {
    const admin = createAdminClient();
    const [c, v] = await Promise.all([
      admin.from("customers").select("*").order("last_name").limit(500),
      admin
        .from("vehicles")
        .select("*")
        .neq("status", "inactive")
        .order("make"),
    ]);
    customers = (c.data as Customer[]) ?? [];
    vehicles = (v.data as Vehicle[]) ?? [];
    taxRate = await getTaxRate();
  } catch {
    configError = true;
  }

  return (
    <>
      <Link
        href="/admin/reservations"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Reservations
      </Link>
      <PageHeader
        title="New Reservation"
        subtitle="Create a reservation, quote or booking."
      />

      {configError ? (
        <Alert tone="warning">
          Could not load customers and vehicles. Check Supabase configuration.
        </Alert>
      ) : customers.length === 0 ? (
        <Alert tone="info">
          You need at least one customer before creating a reservation.{" "}
          <Link href="/admin/customers/new" className="font-semibold underline">
            Add a customer
          </Link>
          .
        </Alert>
      ) : (
        <ReservationForm
          action={createReservation}
          customers={customers}
          vehicles={vehicles}
          taxRate={taxRate}
        />
      )}
    </>
  );
}
