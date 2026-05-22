import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Pencil, Star, ShieldAlert, Mail, Phone, MapPin,
  CreditCard, ClipboardList,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { CustomerDocuments } from "@/components/admin/customer-documents";
import { RESERVATION_STATUS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteCustomer } from "../actions";
import type {
  Customer, ReservationWithRelations,
} from "@/lib/types/database";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let customer: Customer | null = null;
  let reservations: ReservationWithRelations[] = [];

  try {
    const admin = createAdminClient();
    const [c, r] = await Promise.all([
      admin.from("customers").select("*").eq("id", id).maybeSingle(),
      admin
        .from("reservations")
        .select("*, vehicle:vehicles(*), customer:customers(*)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);
    customer = c.data as Customer | null;
    reservations = (r.data as ReservationWithRelations[]) ?? [];
  } catch {
    notFound();
  }
  if (!customer) notFound();

  const c = customer;
  const totalSpent = reservations
    .filter((r) => ["completed", "active"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount_paid ?? 0), 0);
  const outstanding = reservations.reduce(
    (sum, r) => sum + Number(r.balance_due ?? 0),
    0,
  );

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <PageHeader
        title={`${c.first_name} ${c.last_name}`}
        subtitle={`Customer since ${formatDate(c.created_at)}`}
        actions={
          <>
            <DeleteButton
              action={deleteCustomer.bind(null, id)}
              title="Delete customer"
              message="Delete this customer? Customers with rental history cannot be deleted."
            />
            <Link href={`/admin/customers/${id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </Link>
          </>
        }
      />

      {/* Flags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {c.is_vip && (
          <Badge tone="amber"><Star className="mr-1 h-3 w-3" /> VIP Customer</Badge>
        )}
        {c.is_blacklisted && (
          <Badge tone="red"><ShieldAlert className="mr-1 h-3 w-3" /> Blacklisted</Badge>
        )}
        <Badge tone={c.documents_verified ? "green" : "gray"}>
          {c.documents_verified ? "Documents Verified" : "Documents Pending"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <IconRow icon={Mail} value={c.email} />
              <IconRow icon={Phone} value={c.phone || "—"} />
              <IconRow
                icon={MapPin}
                value={
                  [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ") ||
                  "—"
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Driver License</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <DataRow label="Number" value={c.dl_number || "—"} />
              <DataRow label="State" value={c.dl_state || "—"} />
              <DataRow label="Expiration" value={formatDate(c.dl_expiration)} />
              <DataRow label="Date of Birth" value={formatDate(c.date_of_birth)} />
            </CardBody>
          </Card>

          {(c.insurance_company || c.claim_number) && (
            <Card>
              <CardHeader><CardTitle>Insurance / Claim</CardTitle></CardHeader>
              <CardBody className="space-y-2 text-sm">
                <DataRow label="Insurer" value={c.insurance_company || "—"} />
                <DataRow label="Policy #" value={c.insurance_policy_no || "—"} />
                <DataRow label="Claim #" value={c.claim_number || "—"} />
                <DataRow label="Adjuster" value={c.adjuster_name || "—"} />
                <DataRow label="Adjuster Email" value={c.adjuster_email || "—"} />
                <DataRow label="Adjuster Phone" value={c.adjuster_phone || "—"} />
              </CardBody>
            </Card>
          )}

          {c.notes && (
            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardBody>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {c.notes}
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Activity */}
        <div className="space-y-6 lg:col-span-2">
          <CustomerDocuments customer={c} />

          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStat icon={ClipboardList} label="Total Rentals" value={String(reservations.length)} />
            <MiniStat icon={CreditCard} label="Total Paid" value={formatCurrency(totalSpent)} />
            <MiniStat icon={CreditCard} label="Outstanding" value={formatCurrency(outstanding)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rental History</CardTitle>
              <Link
                href={`/admin/reservations/new?customer=${id}`}
                className="text-xs font-medium text-gold-700"
              >
                New Reservation
              </Link>
            </CardHeader>
            {reservations.length === 0 ? (
              <CardBody>
                <p className="py-4 text-center text-sm text-slate-400">
                  This customer has no reservations yet.
                </p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Reservation</TH>
                    <TH>Vehicle</TH>
                    <TH>Dates</TH>
                    <TH>Status</TH>
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
                      </TD>
                      <TD className="text-slate-600">
                        {r.vehicle
                          ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`
                          : "—"}
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {formatDate(r.pickup_at)} – {formatDate(r.return_at)}
                      </TD>
                      <TD>
                        <Badge tone={RESERVATION_STATUS[r.status].tone}>
                          {RESERVATION_STATUS[r.status].label}
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
        </div>
      </div>
    </>
  );
}

function IconRow({
  icon: Icon, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <Icon className="h-5 w-5 text-gold-600" />
      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
