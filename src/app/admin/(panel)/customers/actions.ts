"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { customerSchema } from "@/lib/validation";
import { zodErrorState, fd, nullable, type ActionState } from "@/lib/form";

function readForm(form: FormData) {
  return {
    first_name: fd(form, "first_name"),
    last_name: fd(form, "last_name"),
    email: fd(form, "email"),
    phone: fd(form, "phone"),
    address: fd(form, "address"),
    city: fd(form, "city"),
    state: fd(form, "state"),
    zip: fd(form, "zip"),
    date_of_birth: fd(form, "date_of_birth"),
    dl_number: fd(form, "dl_number"),
    dl_state: fd(form, "dl_state"),
    dl_expiration: fd(form, "dl_expiration"),
    insurance_company: fd(form, "insurance_company"),
    insurance_policy_no: fd(form, "insurance_policy_no"),
    claim_number: fd(form, "claim_number"),
    adjuster_name: fd(form, "adjuster_name"),
    adjuster_email: fd(form, "adjuster_email"),
    adjuster_phone: fd(form, "adjuster_phone"),
    is_vip: form.get("is_vip") === "on",
    is_blacklisted: form.get("is_blacklisted") === "on",
    documents_verified: form.get("documents_verified") === "on",
    notes: fd(form, "notes"),
  };
}

function toRow(v: ReturnType<typeof customerSchema.parse>) {
  return {
    first_name: v.first_name,
    last_name: v.last_name,
    email: v.email.toLowerCase(),
    phone: nullable(v.phone ?? ""),
    address: nullable(v.address ?? ""),
    city: nullable(v.city ?? ""),
    state: nullable(v.state ?? ""),
    zip: nullable(v.zip ?? ""),
    date_of_birth: nullable(v.date_of_birth ?? ""),
    dl_number: nullable(v.dl_number ?? ""),
    dl_state: nullable(v.dl_state ?? ""),
    dl_expiration: nullable(v.dl_expiration ?? ""),
    insurance_company: nullable(v.insurance_company ?? ""),
    insurance_policy_no: nullable(v.insurance_policy_no ?? ""),
    claim_number: nullable(v.claim_number ?? ""),
    adjuster_name: nullable(v.adjuster_name ?? ""),
    adjuster_email: nullable(v.adjuster_email ?? ""),
    adjuster_phone: nullable(v.adjuster_phone ?? ""),
    is_vip: v.is_vip ?? false,
    is_blacklisted: v.is_blacklisted ?? false,
    documents_verified: v.documents_verified ?? false,
    notes: nullable(v.notes ?? ""),
  };
}

export async function createCustomer(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to add customers." };
  }

  const parsed = customerSchema.safeParse(readForm(form));
  if (!parsed.success) return zodErrorState(parsed.error);

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("customers")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not create customer." };
  }

  await logActivity({
    userId: user.id,
    action: "customer.created",
    entityType: "customer",
    entityId: created.id,
    description: `Added customer ${parsed.data.first_name} ${parsed.data.last_name}`,
  });

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${created.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) {
    return { ok: false, error: "You do not have permission to edit customers." };
  }

  const parsed = customerSchema.safeParse(readForm(form));
  if (!parsed.success) return zodErrorState(parsed.error);

  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update(toRow(parsed.data))
    .eq("id", customerId);

  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "customer.updated",
    entityType: "customer",
    entityId: customerId,
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "customers")) return;

  const admin = createAdminClient();
  const { count } = await admin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  // Keep customers with rental history; only hard-delete fresh records.
  if ((count ?? 0) === 0) {
    await admin.from("customers").delete().eq("id", customerId);
  } else {
    return;
  }

  await logActivity({
    userId: user.id,
    action: "customer.deleted",
    entityType: "customer",
    entityId: customerId,
  });

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
