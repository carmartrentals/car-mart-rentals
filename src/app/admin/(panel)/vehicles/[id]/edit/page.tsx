import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { updateVehicle } from "../../actions";
import type { Vehicle } from "@/lib/types/database";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let vehicle: Vehicle | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    vehicle = data as Vehicle | null;
  } catch {
    notFound();
  }
  if (!vehicle) notFound();

  const action = updateVehicle.bind(null, id);

  return (
    <>
      <Link
        href={`/admin/vehicles/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Vehicle
      </Link>
      <PageHeader
        title={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        subtitle="Update vehicle details, pricing and status."
      />
      <VehicleForm action={action} vehicle={vehicle} />
    </>
  );
}
