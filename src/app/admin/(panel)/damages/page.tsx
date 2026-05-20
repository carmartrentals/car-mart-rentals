import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { DamageForm } from "@/components/admin/damage-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { Damage, DamageSeverity, RepairStatus } from "@/lib/types/database";

type Row = Damage & {
  vehicle: { year: number; make: string; model: string } | null;
  reservation: { reservation_number: string } | null;
};

const SEVERITY_TONE: Record<DamageSeverity, "amber" | "red"> = {
  minor: "amber",
  moderate: "amber",
  major: "red",
};
const REPAIR_TONE: Record<RepairStatus, "gray" | "amber" | "green" | "red"> = {
  reported: "gray",
  in_repair: "amber",
  repaired: "green",
  not_repaired: "red",
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function DamagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let damages: Row[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("damages")
      .select(
        "*, vehicle:vehicles(year,make,model), reservation:reservations(reservation_number)",
      );
    if (sp.status) query = query.eq("repair_status", sp.status);
    if (sp.severity) query = query.eq("severity", sp.severity);

    const [dmgRes, vehRes] = await Promise.all([
      query.order("reported_date", { ascending: false }).limit(200),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    damages = (dmgRes.data as Row[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  const openCount = damages.filter(
    (d) => d.repair_status === "reported" || d.repair_status === "in_repair",
  ).length;

  return (
    <>
      <PageHeader
        title="Damage Management"
        subtitle={`${damages.length} record(s) · ${openCount} open`}
        actions={<DamageForm vehicles={vehicles} />}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load damage records. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search damage records..."
        filters={[
          {
            name: "status",
            label: "All Repair Statuses",
            options: [
              { value: "reported", label: "Reported" },
              { value: "in_repair", label: "In Repair" },
              { value: "repaired", label: "Repaired" },
              { value: "not_repaired", label: "Not Repaired" },
            ],
          },
          {
            name: "severity",
            label: "All Severities",
            options: [
              { value: "minor", label: "Minor" },
              { value: "moderate", label: "Moderate" },
              { value: "major", label: "Major" },
            ],
          },
        ]}
      />

      <Card>
        {damages.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No damage records"
            description="Damage is logged automatically during check-in inspections, or use “Log Damage” to add one manually."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>Location</TH>
                <TH>Severity</TH>
                <TH>Repair Status</TH>
                <TH>Reservation</TH>
                <TH>Reported</TH>
                <TH className="text-right">Est. Cost</TH>
                <TH>Charged</TH>
              </TR>
            </THead>
            <TBody>
              {damages.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium text-slate-800">
                    {d.vehicle
                      ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}`
                      : "—"}
                  </TD>
                  <TD className="text-slate-700">{d.location}</TD>
                  <TD>
                    <Badge tone={SEVERITY_TONE[d.severity]}>
                      {titleCase(d.severity)}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={REPAIR_TONE[d.repair_status]}>
                      {titleCase(d.repair_status)}
                    </Badge>
                  </TD>
                  <TD className="text-slate-500">
                    {d.reservation?.reservation_number ?? "—"}
                  </TD>
                  <TD className="text-slate-500">{formatDate(d.reported_date)}</TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(d.estimated_cost)}
                  </TD>
                  <TD>
                    {d.charged_to_customer ? (
                      <Badge tone="green">
                        {formatCurrency(d.charge_amount)}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
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
