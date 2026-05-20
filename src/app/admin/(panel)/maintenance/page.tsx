import { Wrench } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { MaintenanceForm } from "@/components/admin/maintenance-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { MAINTENANCE_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { MaintenanceRecord } from "@/lib/types/database";

type Row = MaintenanceRecord & {
  vehicle: {
    year: number;
    make: string;
    model: string;
    license_plate: string | null;
  } | null;
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let records: Row[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("maintenance_records")
      .select("*, vehicle:vehicles(year,make,model,license_plate)");
    if (sp.status) query = query.eq("status", sp.status);

    const [recRes, vehRes] = await Promise.all([
      query.order("created_at", { ascending: false }).limit(200),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    records = (recRes.data as Row[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle={`${records.length} record(s) · ${formatCurrency(totalCost)} total cost`}
        actions={<MaintenanceForm vehicles={vehicles} />}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load maintenance records. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search maintenance..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: [
              { value: "scheduled", label: "Scheduled" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "overdue", label: "Overdue" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
      />

      <Card>
        {records.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance records"
            description="Use “Add Service Record” to log oil changes, repairs, registration and scheduled service."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>Type</TH>
                <TH>Description</TH>
                <TH>Status</TH>
                <TH>Service Date</TH>
                <TH>Due</TH>
                <TH className="text-right">Cost</TH>
              </TR>
            </THead>
            <TBody>
              {records.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium text-slate-800">
                    {r.vehicle
                      ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                      : "—"}
                  </TD>
                  <TD>{titleCase(r.maintenance_type)}</TD>
                  <TD className="text-slate-600">{r.description}</TD>
                  <TD>
                    <Badge tone={MAINTENANCE_STATUS[r.status].tone}>
                      {MAINTENANCE_STATUS[r.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-slate-500">
                    {r.service_date ? formatDate(r.service_date) : "—"}
                  </TD>
                  <TD className="text-slate-500">
                    {r.due_date
                      ? formatDate(r.due_date)
                      : r.due_mileage
                        ? `${r.due_mileage.toLocaleString()} mi`
                        : "—"}
                  </TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(r.cost)}
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
