import { UserPlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { LeadForm } from "@/components/admin/lead-form";
import { StatusSelect } from "@/components/admin/status-select";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDate, titleCase } from "@/lib/utils";
import { setLeadStatus } from "./actions";
import type { Lead } from "@/lib/types/database";

const STATUSES = ["new", "contacted", "quoted", "converted", "lost"];

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let leads: Lead[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin.from("leads").select("*");
    if (sp.status) query = query.eq("status", sp.status);

    const [leadRes, vehRes] = await Promise.all([
      query.order("created_at", { ascending: false }).limit(300),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    leads = (leadRes.data as Lead[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  const openLeads = leads.filter((l) =>
    ["new", "contacted", "quoted"].includes(l.status),
  ).length;

  return (
    <>
      <PageHeader
        title="Sales Leads"
        subtitle={`${leads.length} lead(s) · ${openLeads} open`}
        actions={<LeadForm vehicles={vehicles} />}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load leads. Run migration 0006 and check Supabase.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search leads..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
          },
        ]}
      />

      <Card>
        {leads.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No leads yet"
            description="Capture phone, walk-in and referral inquiries so none slip through."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Contact</TH>
                <TH>Source</TH>
                <TH>Inquiry</TH>
                <TH>Added</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {leads.map((l) => (
                <TR key={l.id}>
                  <TD className="font-medium text-slate-800">{l.name}</TD>
                  <TD className="text-slate-600">
                    <span className="block">{l.email || "—"}</span>
                    <span className="block text-xs text-slate-400">
                      {l.phone || ""}
                    </span>
                  </TD>
                  <TD className="text-slate-500">{titleCase(l.source)}</TD>
                  <TD className="max-w-[260px] truncate text-slate-500">
                    {l.message || "—"}
                  </TD>
                  <TD className="text-slate-500">{formatDate(l.created_at)}</TD>
                  <TD>
                    <StatusSelect
                      value={l.status}
                      options={STATUSES}
                      action={setLeadStatus.bind(null, l.id)}
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
