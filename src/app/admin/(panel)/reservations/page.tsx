import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import {
  RESERVATION_STATUS, PAYMENT_STATUS, RESERVATION_SOURCES,
} from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let reservations: ReservationWithRelations[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("reservations")
      .select("*, customer:customers(*), vehicle:vehicles(*)");
    if (sp.status) query = query.eq("status", sp.status);
    if (sp.source) query = query.eq("source", sp.source);
    if (sp.q) query = query.ilike("reservation_number", `%${sp.q}%`);
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(100);
    reservations = (data as ReservationWithRelations[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Reservations"
        subtitle={`${reservations.length} reservation(s)`}
        actions={
          <Link href="/admin/reservations/new">
            <Button>
              <Plus className="h-4 w-4" /> New Reservation
            </Button>
          </Link>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load reservations. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search reservation #..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: Object.entries(RESERVATION_STATUS).map(([v, c]) => ({
              value: v,
              label: c.label,
            })),
          },
          {
            name: "source",
            label: "All Sources",
            options: Object.entries(RESERVATION_SOURCES).map(([v, l]) => ({
              value: v,
              label: l,
            })),
          },
        ]}
      />

      <Card>
        {reservations.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No reservations found"
            description="Create a reservation or adjust your filters."
            action={
              <Link href="/admin/reservations/new">
                <Button>
                  <Plus className="h-4 w-4" /> New Reservation
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Reservation</TH>
                <TH>Customer</TH>
                <TH>Vehicle</TH>
                <TH>Pickup → Return</TH>
                <TH>Status</TH>
                <TH>Payment</TH>
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
                    <span className="block text-xs text-slate-400">
                      {RESERVATION_SOURCES[r.source]}
                    </span>
                  </TD>
                  <TD>
                    {r.customer ? (
                      <span className="font-medium text-slate-800">
                        {r.customer.first_name} {r.customer.last_name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                  <TD className="text-slate-600">
                    {r.vehicle
                      ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                      : "—"}
                  </TD>
                  <TD className="text-xs text-slate-500">
                    {formatDateTime(r.pickup_at)}
                    <br />
                    {formatDateTime(r.return_at)}
                  </TD>
                  <TD>
                    <Badge tone={RESERVATION_STATUS[r.status].tone}>
                      {RESERVATION_STATUS[r.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={PAYMENT_STATUS[r.payment_status].tone}>
                      {PAYMENT_STATUS[r.payment_status].label}
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
    </>
  );
}
