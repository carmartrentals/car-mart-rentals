import { Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { ExpenseForm } from "@/components/admin/expense-form";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type { Expense } from "@/lib/types/database";

type Row = Expense & {
  vehicle: { year: number; make: string; model: string } | null;
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let expenses: Row[] = [];
  let vehicles: { id: string; label: string }[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("expenses")
      .select("*, vehicle:vehicles(year,make,model)");
    if (sp.category) query = query.eq("category", sp.category);

    const [expRes, vehRes] = await Promise.all([
      query.order("expense_date", { ascending: false }).limit(300),
      admin.from("vehicles").select("id,year,make,model").order("make"),
    ]);
    expenses = (expRes.data as unknown as Row[]) ?? [];
    vehicles = (
      (vehRes.data as { id: string; year: number; make: string; model: string }[]) ?? []
    ).map((v) => ({ id: v.id, label: `${v.year} ${v.make} ${v.model}` }));
  } catch {
    configError = true;
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} record(s) · ${formatCurrency(total)} total`}
        actions={<ExpenseForm vehicles={vehicles} />}
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load expenses. Run migration 0006 and check Supabase.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search expenses..."
        filters={[
          {
            name: "category",
            label: "All Categories",
            options: [
              { value: "fuel", label: "Fuel" },
              { value: "maintenance", label: "Maintenance" },
              { value: "repairs", label: "Repairs" },
              { value: "insurance", label: "Insurance" },
              { value: "marketing", label: "Marketing" },
              { value: "payroll", label: "Payroll" },
              { value: "other", label: "Other" },
            ],
          },
        ]}
      />

      <Card>
        {expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses recorded"
            description="Track fuel, maintenance, insurance and overhead to see true profit per vehicle."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH>Vehicle</TH>
                <TH>Vendor</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {expenses.map((e) => (
                <TR key={e.id}>
                  <TD className="text-slate-500">{formatDate(e.expense_date)}</TD>
                  <TD>{titleCase(e.category)}</TD>
                  <TD className="font-medium text-slate-800">{e.description}</TD>
                  <TD className="text-slate-500">
                    {e.vehicle
                      ? `${e.vehicle.make} ${e.vehicle.model}`
                      : "—"}
                  </TD>
                  <TD className="text-slate-500">{e.vendor || "—"}</TD>
                  <TD className="text-right font-medium">
                    {formatCurrency(e.amount)}
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
