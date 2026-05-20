import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { createVehicle } from "../actions";

export default function NewVehiclePage() {
  return (
    <>
      <Link
        href="/admin/vehicles"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>
      <PageHeader
        title="Add Vehicle"
        subtitle="Add a new vehicle to the Car Mart Rentals fleet."
      />
      <VehicleForm action={createVehicle} />
    </>
  );
}
