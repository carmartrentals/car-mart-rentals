import Link from "next/link";
import { Plus, Users, Star, ShieldAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/lib/types/database";

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let customers: Customer[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    let query = admin.from("customers").select("*");
    if (sp.flag === "vip") query = query.eq("is_vip", true);
    if (sp.flag === "blacklisted") query = query.eq("is_blacklisted", true);
    if (sp.flag === "unverified") query = query.eq("documents_verified", false);
    if (sp.q) {
      query = query.or(
        `first_name.ilike.%${sp.q}%,last_name.ilike.%${sp.q}%,email.ilike.%${sp.q}%,phone.ilike.%${sp.q}%`,
      );
    }
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(200);
    customers = (data as Customer[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer(s)`}
        actions={
          <Link href="/admin/customers/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        }
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load customers. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <FilterBar
        searchPlaceholder="Search name, email, phone..."
        filters={[
          {
            name: "flag",
            label: "All Customers",
            options: [
              { value: "vip", label: "VIP" },
              { value: "unverified", label: "Docs Unverified" },
              { value: "blacklisted", label: "Blacklisted" },
            ],
          },
        ]}
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add your first customer or adjust your filters."
            action={
              <Link href="/admin/customers/new">
                <Button>
                  <Plus className="h-4 w-4" /> Add Customer
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Contact</TH>
                <TH>License</TH>
                <TH>Flags</TH>
                <TH>Added</TH>
              </TR>
            </THead>
            <TBody>
              {customers.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-gold-700 hover:underline"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                  </TD>
                  <TD className="text-slate-600">
                    <span className="block">{c.email}</span>
                    <span className="block text-xs text-slate-400">
                      {c.phone || "—"}
                    </span>
                  </TD>
                  <TD className="text-slate-500">
                    {c.dl_number ? `${c.dl_number} (${c.dl_state || "—"})` : "—"}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {c.is_vip && (
                        <Badge tone="amber">
                          <Star className="mr-1 h-3 w-3" /> VIP
                        </Badge>
                      )}
                      {c.is_blacklisted && (
                        <Badge tone="red">
                          <ShieldAlert className="mr-1 h-3 w-3" /> Blacklist
                        </Badge>
                      )}
                      {!c.documents_verified && (
                        <Badge tone="gray">Docs Pending</Badge>
                      )}
                      {c.documents_verified && (
                        <Badge tone="green">Verified</Badge>
                      )}
                    </div>
                  </TD>
                  <TD className="text-slate-500">{formatDate(c.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
