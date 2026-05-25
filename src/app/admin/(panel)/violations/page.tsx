import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { ViolationForm } from "@/components/admin/violation-form";
import { StatusSelect } from "@/components/admin/status-select";
import { ChargeTollButton } from "@/components/admin/charge-toll-button";
import { DeleteViolationButton } from "@/components/admin/delete-violation-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import {
  setViolationStatus,
  matchReservationForViolation,
  getDefaultHandlingFee,
} from "./actions";
import type { TollViolation } from "@/lib/types/database";

type Row = TollViolation & {
  vehicle: { year: number; make: string; model: string } | null;
  reservation: {
    reservation_number: string;
    customer: { first_name: string; last_name: string } | null;
  } | null;
  matched_reservation?: {
    id: string;
    reservation_number: string;
    customerName: string | null;
  } | null;
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
  let defaultFee = 5;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("toll_violations")
      .select(
        "*, vehicle:vehicles(year,make,model), reservation:reservations(reservation_number, customer:customers(first_name, last_name))",
      );
    if (sp.status) query = query.eq("status", sp.status);

    const [vRes, vehRes, fee] = await Promise.all([
      query.order("incurred_date", { ascending: false }).limit(300),
      admin.from("vehicles").select("id,year,make,model").order("make"),
      getDefaultHandlingFee(),
    ]);
    rows = (vRes.data as unknown as Row[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
    defaultFee = fee;

    // For unmatched rows, try to find a matching reservation now so the
    // operator can charge in one click without manually picking one.
    for (const r of rows) {
      if (!r.reservation_id && !r.charged_to_customer) {
        const m = await matchReservationForViolation(
          r.vehicle_id,
          r.incurred_date,
        );
        if (m) {
          r.matched_reservation = {
            id: m.id,
            reservation_number: m.reservation_number,
            customerName: null,
          };
        }
      }
    }
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
                <TH>Renter</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const linkedRes = r.reservation; // already-linked reservation row
                const customerName = linkedRes?.customer
                  ? `${linkedRes.customer.first_name} ${linkedRes.customer.last_name}`.trim()
                  : null;
                const matched = r.matched_reservation;
                return (
                  <TR key={r.id}>
                    <TD className="text-slate-500">
                      {formatDate(r.incurred_date)}
                    </TD>
                    <TD className="font-medium text-slate-800">
                      {r.vehicle
                        ? `${r.vehicle.make} ${r.vehicle.model}`
                        : "—"}
                    </TD>
                    <TD>{titleCase(r.violation_type)}</TD>
                    <TD className="text-slate-500">{r.location || "—"}</TD>
                    <TD className="text-right font-medium">
                      {formatCurrency(r.amount)}
                      {r.charged_to_customer && r.customer_charge_total && (
                        <div className="text-xs font-normal text-emerald-700">
                          +{formatCurrency(Number(r.handling_fee))} fee ={" "}
                          {formatCurrency(Number(r.customer_charge_total))}
                        </div>
                      )}
                    </TD>
                    <TD>
                      {linkedRes ? (
                        <>
                          <Link
                            href={`/admin/reservations/${r.reservation_id}`}
                            className="text-sm font-medium text-gold-700 hover:text-gold-600"
                          >
                            {linkedRes.reservation_number}
                          </Link>
                          {customerName && (
                            <div className="text-xs text-slate-500">
                              {customerName}
                            </div>
                          )}
                        </>
                      ) : matched ? (
                        <span className="text-xs text-slate-500">
                          Match:{" "}
                          <Link
                            href={`/admin/reservations/${matched.id}`}
                            className="font-medium text-gold-700 hover:text-gold-600"
                          >
                            {matched.reservation_number}
                          </Link>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No matching rental
                        </span>
                      )}
                    </TD>
                    <TD>
                      <StatusSelect
                        value={r.status}
                        options={STATUSES}
                        action={setViolationStatus.bind(null, r.id)}
                      />
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!r.charged_to_customer &&
                          (linkedRes || matched) &&
                          Number(r.amount) > 0 && (
                            <ChargeTollButton
                              violationId={r.id}
                              tollAmount={Number(r.amount)}
                              defaultHandlingFee={defaultFee}
                              reservationNumber={
                                linkedRes?.reservation_number ??
                                matched?.reservation_number ??
                                ""
                              }
                              customerName={customerName}
                            />
                          )}
                        {r.charged_to_customer && (
                          <span className="text-xs font-medium text-emerald-700">
                            Charged ✓
                          </span>
                        )}
                        <DeleteViolationButton
                          violationId={r.id}
                          wasCharged={r.charged_to_customer}
                        />
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
