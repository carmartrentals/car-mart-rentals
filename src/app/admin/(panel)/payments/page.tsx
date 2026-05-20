import Link from "next/link";
import { CreditCard } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import type { Payment } from "@/lib/types/database";

type PaymentRow = Payment & {
  reservation: { reservation_number: string } | null;
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let payments: PaymentRow[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("payments")
      .select("*, reservation:reservations(reservation_number)");
    if (sp.type) query = query.eq("payment_type", sp.type);
    if (sp.reservation) query = query.eq("reservation_id", sp.reservation);
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(200);
    payments = (data as PaymentRow[]) ?? [];
  } catch {
    configError = true;
  }

  const received = payments
    .filter((p) => p.payment_type === "payment" && p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <>
      <PageHeader
        title="Payments & Deposits"
        subtitle={`${payments.length} record(s) · ${formatCurrency(received)} received`}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load payments. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search payments..."
        filters={[
          {
            name: "type",
            label: "All Types",
            options: [
              { value: "payment", label: "Payments" },
              { value: "deposit", label: "Deposits" },
              { value: "refund", label: "Refunds" },
              { value: "adjustment", label: "Adjustments" },
            ],
          },
        ]}
      />

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Record payments from any reservation's Payments & Deposit panel, or via a Stripe payment link."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Reservation</TH>
                <TH>Type</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="text-slate-500">
                    {formatDateTime(p.created_at)}
                  </TD>
                  <TD>
                    {p.reservation_id ? (
                      <Link
                        href={`/admin/reservations/${p.reservation_id}`}
                        className="text-gold-700 hover:underline"
                      >
                        {p.reservation?.reservation_number ?? "View"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>{titleCase(p.payment_type)}</TD>
                  <TD className="text-slate-500">{titleCase(p.method)}</TD>
                  <TD>
                    <Badge
                      tone={
                        p.status === "succeeded"
                          ? "green"
                          : p.status === "failed"
                            ? "red"
                            : p.status === "refunded"
                              ? "gray"
                              : "amber"
                      }
                    >
                      {titleCase(p.status)}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium">
                    <span
                      className={
                        p.payment_type === "refund" ? "text-rose-600" : ""
                      }
                    >
                      {p.payment_type === "refund" ? "- " : ""}
                      {formatCurrency(p.amount)}
                    </span>
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
