import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  VEHICLE_STATUS, VEHICLE_CATEGORIES, FUEL_TYPES,
  RESERVATION_STATUS, MAINTENANCE_STATUS,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteVehicle } from "../actions";
import type {
  Vehicle, VehicleImage, MaintenanceRecord, Damage,
  ReservationWithRelations,
} from "@/lib/types/database";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let vehicle: Vehicle | null = null;
  let images: VehicleImage[] = [];
  let reservations: ReservationWithRelations[] = [];
  let maintenance: MaintenanceRecord[] = [];
  let damages: Damage[] = [];

  try {
    const admin = createAdminClient();
    const [v, img, res, mnt, dmg] = await Promise.all([
      admin.from("vehicles").select("*").eq("id", id).maybeSingle(),
      admin.from("vehicle_images").select("*").eq("vehicle_id", id).order("sort_order"),
      admin
        .from("reservations")
        .select("*, customer:customers(*), vehicle:vehicles(*)")
        .eq("vehicle_id", id)
        .order("pickup_at", { ascending: false })
        .limit(6),
      admin
        .from("maintenance_records")
        .select("*")
        .eq("vehicle_id", id)
        .order("created_at", { ascending: false })
        .limit(6),
      admin
        .from("damages")
        .select("*")
        .eq("vehicle_id", id)
        .order("reported_date", { ascending: false })
        .limit(6),
    ]);
    vehicle = v.data as Vehicle | null;
    images = (img.data as VehicleImage[]) ?? [];
    reservations = (res.data as ReservationWithRelations[]) ?? [];
    maintenance = (mnt.data as MaintenanceRecord[]) ?? [];
    damages = (dmg.data as Damage[]) ?? [];
  } catch {
    notFound();
  }
  if (!vehicle) notFound();

  const v = vehicle;
  const specs: [string, string][] = [
    ["VIN", v.vin || "—"],
    ["License Plate", v.license_plate || "—"],
    ["Color", v.color || "—"],
    ["Category", VEHICLE_CATEGORIES[v.category]],
    ["Fuel Type", FUEL_TYPES[v.fuel_type]],
    ["Transmission", v.transmission === "automatic" ? "Automatic" : "Manual"],
    ["Seats / Doors", `${v.seats} / ${v.doors}`],
    ["Odometer", `${v.odometer.toLocaleString()} mi`],
    ["GPS Device", v.gps_device_id || "—"],
    ["Registration Exp.", formatDate(v.registration_expiration)],
    ["Insurance Exp.", formatDate(v.insurance_expiration)],
  ];
  const pricing: [string, string][] = [
    ["Daily Rate", formatCurrency(v.daily_rate)],
    ["Weekend Rate", v.weekend_rate ? formatCurrency(v.weekend_rate) : "—"],
    ["Weekly Rate", v.weekly_rate ? formatCurrency(v.weekly_rate) : "—"],
    ["Monthly Rate", v.monthly_rate ? formatCurrency(v.monthly_rate) : "—"],
    ["Security Deposit", formatCurrency(v.security_deposit)],
    [
      "Mileage Limit",
      v.mileage_limit === 0 ? "Unlimited" : `${v.mileage_limit} mi/day`,
    ],
    ["Extra Mileage", `${formatCurrency(v.extra_mileage_fee)}/mi`],
    ["Cleaning Fee", formatCurrency(v.cleaning_fee)],
  ];

  return (
    <>
      <Link
        href="/admin/vehicles"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Vehicles
      </Link>

      <PageHeader
        title={`${v.year} ${v.make} ${v.model}`}
        subtitle={v.trim ?? undefined}
        actions={
          <>
            <DeleteButton
              action={deleteVehicle.bind(null, id)}
              title="Delete vehicle"
              message="Delete this vehicle? If it has active or upcoming reservations it will be deactivated instead."
            />
            <Link href={`/admin/vehicles/${id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: image + status */}
        <div className="space-y-6">
          <Card>
            <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-slate-100">
              {v.main_image_url && (
                <Image
                  src={v.main_image_url}
                  alt={v.model}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              )}
            </div>
            <CardBody className="flex items-center justify-between">
              <Badge tone={VEHICLE_STATUS[v.status].tone}>
                {VEHICLE_STATUS[v.status].label}
              </Badge>
              {v.is_featured && <Badge tone="amber">Featured</Badge>}
            </CardBody>
          </Card>

          {images.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Gallery</CardTitle></CardHeader>
              <CardBody className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <span
                    key={img.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-100"
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="20vw"
                      className="object-cover"
                    />
                  </span>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* RIGHT: specs + pricing */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {specs.map(([k, val]) => (
                  <Row key={k} label={k} value={val} />
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pricing & Policies</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {pricing.map(([k, val]) => (
                  <Row key={k} label={k} value={val} />
                ))}
              </CardBody>
            </Card>
          </div>

          {v.features.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Features</CardTitle></CardHeader>
              <CardBody className="flex flex-wrap gap-2">
                {v.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {f}
                  </span>
                ))}
              </CardBody>
            </Card>
          )}

          {v.internal_notes && (
            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {v.internal_notes}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Reservations */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Reservations</CardTitle>
        </CardHeader>
        {reservations.length === 0 ? (
          <CardBody>
            <p className="py-4 text-center text-sm text-slate-400">
              No reservations for this vehicle yet.
            </p>
          </CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Reservation</TH>
                <TH>Customer</TH>
                <TH>Dates</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {reservations.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="font-medium text-gold-700 hover:underline"
                    >
                      {r.reservation_number}
                    </Link>
                  </TD>
                  <TD>
                    {r.customer
                      ? `${r.customer.first_name} ${r.customer.last_name}`
                      : "—"}
                  </TD>
                  <TD className="text-slate-500">
                    {formatDate(r.pickup_at)} – {formatDate(r.return_at)}
                  </TD>
                  <TD>
                    <Badge tone={RESERVATION_STATUS[r.status].tone}>
                      {RESERVATION_STATUS[r.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(r.total)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Maintenance + Damages */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance History</CardTitle>
            <Link
              href={`/admin/maintenance?vehicle=${id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-700"
            >
              <Plus className="h-3.5 w-3.5" /> Manage
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {maintenance.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No maintenance records.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {maintenance.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {m.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(m.service_date ?? m.created_at)} ·{" "}
                        {formatCurrency(m.cost)}
                      </p>
                    </div>
                    <Badge tone={MAINTENANCE_STATUS[m.status].tone}>
                      {MAINTENANCE_STATUS[m.status].label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Damage Records</CardTitle>
            <Link
              href={`/admin/damages?vehicle=${id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-700"
            >
              <Plus className="h-3.5 w-3.5" /> Manage
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {damages.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                No damage records — vehicle is in good standing.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {damages.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {d.location}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(d.reported_date)} ·{" "}
                        {formatCurrency(d.estimated_cost)}
                      </p>
                    </div>
                    <Badge
                      tone={d.repair_status === "repaired" ? "green" : "amber"}
                    >
                      {d.repair_status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
