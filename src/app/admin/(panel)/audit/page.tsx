import Link from "next/link";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
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

type SearchParams = Promise<{
  from?: string;
  to?: string;
  action?: string;
  user?: string;
  page?: string;
}>;

const PAGE_SIZE = 100;

/** YYYY-MM-DD for a date that's `days` days ago (UTC). */
function isoDate(days = 0): string {
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString().slice(0, 10);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // Defaults: last 30 days. The user can clear or change these.
  const fromDate = sp.from || isoDate(30);
  const toDate = sp.to || isoDate(0);
  const actionFilter = sp.action || "";
  const userFilter = sp.user || "";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  let logs: Row[] = [];
  let totalCount = 0;
  let actionOptions: string[] = [];
  let userOptions: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();

    // Build the filter query — used for both the page and the count.
    const fromIso = new Date(`${fromDate}T00:00:00Z`).toISOString();
    const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();

    let query = admin
      .from("activity_logs")
      .select("*, user:users(full_name,email)", { count: "exact" })
      .gte("created_at", fromIso)
      .lte("created_at", toIso);
    if (actionFilter) query = query.eq("action", actionFilter);
    if (userFilter) query = query.eq("user_id", userFilter);

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    logs = (data as unknown as Row[]) ?? [];
    totalCount = count ?? 0;

    // Distinct action values for the dropdown — over the same window.
    const { data: actionsData } = await admin
      .from("activity_logs")
      .select("action")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .limit(2000);
    actionOptions = Array.from(
      new Set(
        ((actionsData as { action: string }[] | null) ?? []).map((r) => r.action),
      ),
    ).sort();

    // Distinct users for the dropdown.
    const { data: usersData } = await admin
      .from("users")
      .select("id, full_name, email")
      .order("full_name");
    userOptions = ((usersData as { id: string; full_name: string; email: string }[] | null) ?? [])
      .map((u) => ({ id: u.id, label: u.full_name || u.email }));
  } catch {
    configError = true;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const queryWithout = (drop: string) => {
    const params = new URLSearchParams();
    if (sp.from && drop !== "from") params.set("from", sp.from);
    if (sp.to && drop !== "to") params.set("to", sp.to);
    if (sp.action && drop !== "action") params.set("action", sp.action);
    if (sp.user && drop !== "user") params.set("user", sp.user);
    return params.toString();
  };
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.action) params.set("action", sp.action);
    if (sp.user) params.set("user", sp.user);
    params.set("page", String(n));
    return `?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Every action taken in the admin panel — kept indefinitely."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load the audit log. Check Supabase configuration.
          </Alert>
        </div>
      )}

      {/* Filter bar */}
      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              From
            </span>
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
            </span>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Action
            </span>
            <select
              name="action"
              defaultValue={actionFilter}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {titleCase(a.replace(/\./g, " "))}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Staff
            </span>
            <select
              name="user"
              defaultValue={userFilter}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">All staff</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-9 rounded-md bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
            >
              Apply
            </button>
            <Link
              href="/admin/audit"
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium leading-9 text-slate-600 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity in this date range"
            description="Adjust the filters above, or expand the date range to see older events."
          />
        ) : (
          <>
            <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} events
            </div>
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
                      <span className="block font-medium text-slate-700">
                        {formatDateTime(l.created_at).split(",")[0] ||
                          formatDateTime(l.created_at)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(l.created_at)}
                      </span>
                    </TD>
                    <TD className="text-slate-700">
                      {l.user?.full_name || l.user?.email || "System"}
                    </TD>
                    <TD>
                      <Badge tone="gray">
                        {titleCase(l.action.replace(/\./g, " "))}
                      </Badge>
                    </TD>
                    <TD className="text-slate-600">
                      {l.description ||
                        (l.entity_type ? titleCase(l.entity_type) : "—")}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-gold-600"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-gold-600"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-slate-400">
        Audit logs are kept indefinitely — every staff action ever taken in the
        admin panel is recorded here.{" "}
        {queryWithout("") && (
          <Link href="/admin/audit" className="hover:text-gold-600 hover:underline">
            Clear all filters
          </Link>
        )}
      </p>
    </>
  );
}
