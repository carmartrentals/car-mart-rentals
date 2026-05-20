import Link from "next/link";
import Image from "next/image";
import { Plus, Car, Pencil } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { VEHICLE_STATUS, VEHICLE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let vehicles: Vehicle[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin.from("vehicles").select("*");
    if (sp.status) query = query.eq("status", sp.status);
    if (sp.category) query = query.eq("category", sp.category);
    if (sp.q) {
      query = query.or(
        `make.ilike.%${sp.q}%,model.ilike.%${sp.q}%,license_plate.ilike.%${sp.q}%,vin.ilike.%${sp.q}%`,
      );
    }
    const { data } = await query.order("created_at", { ascending: false });
    vehicles = (data as Vehicle[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} vehicle(s) in the fleet`}
        actions={
          <Link href="/admin/vehicles/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Vehicle
            </Button>
          </Link>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load vehicles. Verify Supabase environment variables and
            that migrations have been applied.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search make, model, plate, VIN..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: Object.entries(VEHICLE_STATUS).map(([v, c]) => ({
              value: v,
              label: c.label,
            })),
          },
          {
            name: "category",
            label: "All Categories",
            options: Object.entries(VEHICLE_CATEGORIES).map(([v, l]) => ({
              value: v,
              label: l,
            })),
          },
        ]}
      />

      <Card>
        {vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles found"
            description="Add your first vehicle or adjust your filters."
            action={
              <Link href="/admin/vehicles/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add Vehicle
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>Category</TH>
                <TH>Status</TH>
                <TH>Plate</TH>
                <TH>Odometer</TH>
                <TH className="text-right">Daily Rate</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {vehicles.map((v) => (
                <TR key={v.id}>
                  <TD>
                    <Link
                      href={`/admin/vehicles/${v.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {v.main_image_url && (
                          <Image
                            src={v.main_image_url}
                            alt={v.model}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-800">
                          {v.year} {v.make} {v.model}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {v.trim || v.color || "—"}
                        </span>
                      </span>
                    </Link>
                  </TD>
                  <TD>{VEHICLE_CATEGORIES[v.category]}</TD>
                  <TD>
                    <Badge tone={VEHICLE_STATUS[v.status].tone}>
                      {VEHICLE_STATUS[v.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-slate-500">{v.license_plate || "—"}</TD>
                  <TD className="text-slate-500">
                    {v.odometer.toLocaleString()} mi
                  </TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(v.daily_rate)}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/admin/vehicles/${v.id}/edit`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-gold-700 hover:text-gold-600"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
