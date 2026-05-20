import { TriangleAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { ViolationForm } from "@/components/admin/violation-form";
import { StatusSelect } from "@/components/admin/status-select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { setViolationStatus } from "./actions";
import type { TollViolation } from "@/lib/types/database";

type Row = TollViolation & {
  vehicle: { year: number; make: string; model: string } | null;
};

const STATUSES = ["unpaid", "paid", "charged_to_customer", "disputed", "waived"];

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ViolationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let rows: Row[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("toll_violations")
      .select("*, vehicle:vehicles(year,make,model)");
    if (sp.status) query = query.eq("status", sp.status);

    const [vRes, vehRes] = await Promise.all([
      query.order("incurred_date", { ascending: false }).limit(300),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    rows = (vRes.data as unknown as Row[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  const unpaid = rows
    .filter((r) => r.status === "unpaid")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <PageHeader
        title="Tolls & Violations"
        subtitle={`${rows.length} record(s) · ${formatCurrency(unpaid)} unpaid`}
        actions={<ViolationForm vehicles={vehicles} />}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load violations. Run migration 0006 and check Supabase.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search tolls & violations..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
          },
        ]}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={TriangleAlert}
            title="No tolls or violations"
            description="Record tolls, parking tickets and citations against your vehicles."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Vehicle</TH>
                <TH>Type</TH>
                <TH>Location</TH>
                <TH className="text-right">Amount</TH>
                <TH>Charged?</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="text-slate-500">{formatDate(r.incurred_date)}</TD>
                  <TD className="font-medium text-slate-800">
                    {r.vehicle
                      ? `${r.vehicle.make} ${r.vehicle.model}`
                      : "—"}
                  </TD>
                  <TD>{titleCase(r.violation_type)}</TD>
                  <TD className="text-slate-500">{r.location || "—"}</TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(r.amount)}
                  </TD>
                  <TD>
                    {r.charged_to_customer ? (
                      <Badge tone="green">Customer</Badge>
                    ) : (
                      <span className="text-slate-400">Company</span>
                    )}
                  </TD>
                  <TD>
                    <StatusSelect
                      value={r.status}
                      options={STATUSES}
                      action={setViolationStatus.bind(null, r.id)}
                    />
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
