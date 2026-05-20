import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/types/database";

/**
 * Returns the customer-portal account for the signed-in user, or null.
 * Staff users (no linked customer record) resolve to null.
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
    return (data as Customer) ?? null;
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
