import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/lib/types/database";

type InvoiceRow = Invoice & {
  customer: { first_name: string; last_name: string } | null;
  reservation: { reservation_number: string } | null;
};

const STATUS_TONE: Record<
  InvoiceStatus,
  "gray" | "blue" | "amber" | "green" | "red"
> = {
  draft: "gray",
  issued: "blue",
  partial: "amber",
  paid: "green",
  overdue: "red",
  void: "gray",
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let invoices: InvoiceRow[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("invoices")
      .select(
        "*, customer:customers(first_name,last_name), reservation:reservations(reservation_number)",
      );
    if (sp.status) query = query.eq("status", sp.status);
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(200);
    invoices = (data as InvoiceRow[]) ?? [];
  } catch {
    configError = true;
  }

  const outstanding = invoices.reduce((sum, i) => sum + Number(i.balance), 0);

  return (
    <>
      <PageHeader
        title="Invoices & Documents"
        subtitle={`${invoices.length} invoice(s) · ${formatCurrency(outstanding)} outstanding`}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load invoices. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search invoices..."
        filters={[
          {
            name: "status",
            label: "All Statuses",
            options: [
              { value: "draft", label: "Draft" },
              { value: "issued", label: "Issued" },
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
              { value: "void", label: "Void" },
            ],
          },
        ]}
      />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Invoices are created automatically at vehicle check-in. You can also open any reservation to download an invoice PDF."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Invoice #</TH>
                <TH>Customer</TH>
                <TH>Reservation</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Balance</TH>
                <TH>Status</TH>
                <TH>Issued</TH>
                <TH>PDF</TH>
              </TR>
            </THead>
            <TBody>
              {invoices.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-medium text-slate-800">
                    {inv.invoice_number}
                  </TD>
                  <TD className="text-slate-600">
                    {inv.customer
                      ? `${inv.customer.first_name} ${inv.customer.last_name}`
                      : "—"}
                  </TD>
                  <TD>
                    {inv.reservation_id ? (
                      <Link
                        href={`/admin/reservations/${inv.reservation_id}`}
                        className="text-gold-700 hover:underline"
                      >
                        {inv.reservation?.reservation_number ?? "View"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(inv.total)}
                  </TD>
                  <TD className="text-right">
                    <span
                      className={
                        Number(inv.balance) > 0
                          ? "font-semibold text-rose-600"
                          : "text-slate-400"
                      }
                    >
                      {formatCurrency(inv.balance)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[inv.status]}>
                      {titleCase(inv.status)}
                    </Badge>
                  </TD>
                  <TD className="text-slate-500">
                    {inv.issued_date ? formatDate(inv.issued_date) : "—"}
                  </TD>
                  <TD>
                    {inv.reservation_id ? (
                      <a
                        href={`/api/admin/documents/invoice/${inv.reservation_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-gold-700 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    ) : (
                      "—"
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
