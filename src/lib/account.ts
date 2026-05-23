import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/types/database";

/**
 * Returns the customer-portal account for the signed-in user, or null.
 * Staff users (no linked customer record) resolve to null.
 *
 * If the auth account was created as a customer but the `customers` row is
 * missing — e.g. the database trigger failed or didn't see the metadata —
 * we self-heal by creating one. This prevents customers from being silently
 * locked out of the portal after a successful registration.
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) return data as Customer;

    // No customer row — only auto-create one if this account is explicitly a
    // customer (or has no account_type at all, e.g. a legacy signup). Staff
    // users will have account_type === "staff" and are skipped.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const accountType = String(meta.account_type ?? "customer");
    if (accountType !== "customer") return null;

    // First, link an existing customer record by email if one exists.
    const email = user.email ?? "";
    if (email) {
      const { data: existing } = await admin
        .from("customers")
        .select("*")
        .ilike("email", email)
        .is("user_id", null)
        .maybeSingle();
      if (existing) {
        const { data: linked } = await admin
          .from("customers")
          .update({ user_id: user.id })
          .eq("id", (existing as Customer).id)
          .select("*")
          .maybeSingle();
        return (linked as Customer) ?? (existing as Customer);
      }
    }

    // Otherwise create a fresh customer profile from auth metadata.
    const fullName = String(meta.full_name ?? email.split("@")[0] ?? "Customer");
    const [first, ...rest] = fullName.trim().split(/\s+/);
    const { data: created } = await admin
      .from("customers")
      .insert({
        user_id: user.id,
        email,
        first_name: first || "Customer",
        last_name: rest.join(" ") || "",
      })
      .select("*")
      .maybeSingle();
    return (created as Customer) ?? null;
  } catch {
    return null;
  }
}

/** Require a signed-in customer — redirects to the portal login otherwise. */
export async function requireCustomer(): Promise<Customer> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");
  return customer;
}

/** True when the signed-in user may view the given reservation. */
export async function customerOwnsReservation(
  reservationId: string,
): Promise<boolean> {
  const customer = await getCurrentCustomer();
  if (!customer) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  return Boolean(data);
}
