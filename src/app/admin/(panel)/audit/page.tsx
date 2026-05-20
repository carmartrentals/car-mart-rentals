import { History } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { ActivityLog } from "@/lib/types/database";

type Row = ActivityLog & {
  user: { full_name: string; email: string } | null;
};

export default async function AuditLogPage() {
  let logs: Row[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("activity_logs")
      .select("*, user:users(full_name,email)")
      .order("created_at", { ascending: false })
      .limit(300);
    logs = (data as unknown as Row[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="A record of every action taken in the admin panel."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load the audit log. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <Card>
        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Staff actions — edits, payments, check-ins and more — will appear here."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Staff Member</TH>
                <TH>Action</TH>
                <TH>Details</TH>
              </TR>
            </THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap text-slate-500">
                    {formatDateTime(l.created_at)}
                  </TD>
                  <TD className="text-slate-700">
                    {l.user?.full_name || l.user?.email || "System"}
                  </TD>
                  <TD>
                    <Badge tone="gray">{titleCase(l.action.replace(/\./g, " "))}</Badge>
                  </TD>
                  <TD className="text-slate-600">
                    {l.description ||
                      (l.entity_type ? titleCase(l.entity_type) : "—")}
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
