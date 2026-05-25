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

    // Tolerate any pre-existing duplicate rows in production — use limit(1)
    // + order rather than maybeSingle() (which errors on 2+ matches). After
    // migration 0027 there should be at most one row per user_id, but the
    // defensive read costs nothing.
    const { data: byUser } = await admin
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (byUser && byUser.length > 0) return byUser[0] as Customer;

    // No row keyed to this auth user — only auto-create one if this account
    // is explicitly a customer (or has no account_type at all, e.g. a
    // legacy signup). Staff / super-admin accounts are skipped so signing
    // into the admin panel doesn't pollute the customer list.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const accountType = String(meta.account_type ?? "customer");
    if (accountType !== "customer") return null;

    const email = (user.email ?? "").trim();

    // Adopt an existing customer record that matches by email but has no
    // user_id yet (admin pre-created the customer, then they self-signed-up).
    if (email) {
      const { data: orphans } = await admin
        .from("customers")
        .select("*")
        .ilike("email", email)
        .is("user_id", null)
        .order("created_at", { ascending: true })
        .limit(1);
      const orphan = orphans?.[0] as Customer | undefined;
      if (orphan) {
        const { data: linked } = await admin
          .from("customers")
          .update({ user_id: user.id })
          .eq("id", orphan.id)
          .select("*")
          .limit(1);
        return (linked?.[0] as Customer) ?? orphan;
      }
    }

    // Otherwise create a fresh customer profile from auth metadata. The
    // partial unique index on user_id (migration 0027) makes this race-safe:
    // if a parallel request raced ahead and already inserted, the second
    // insert errors and we re-read the winning row instead of double-writing.
    const fullName = String(meta.full_name ?? email.split("@")[0] ?? "Customer");
    const [first, ...rest] = fullName.trim().split(/\s+/);
    const { data: created, error: insertErr } = await admin
      .from("customers")
      .insert({
        user_id: user.id,
        email,
        first_name: first || "Customer",
        last_name: rest.join(" ") || "",
      })
      .select("*")
      .limit(1);
    if (created && created.length > 0) return created[0] as Customer;

    // Lost the race — re-read the row the winning request wrote.
    if (insertErr) {
      const { data: winner } = await admin
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (winner && winner.length > 0) return winner[0] as Customer;
    }
    return null;
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
