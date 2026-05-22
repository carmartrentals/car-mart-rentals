"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { UserRole } from "@/lib/types/database";

const ROLES: UserRole[] = ["super_admin", "manager", "staff", "accountant", "viewer"];

/** Invite a new staff member — creates their login and profile. */
export async function inviteUser(input: {
  email: string;
  full_name: string;
  role: string;
  password: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can manage staff users." };
  }
  if (!input.email.trim()) return { ok: false, error: "Enter an email address." };
  if (input.password.length < 8) {
    return { ok: false, error: "The temporary password must be at least 8 characters." };
  }
  if (!ROLES.includes(input.role as UserRole)) {
    return { ok: false, error: "Invalid role." };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name.trim(),
      role: input.role,
      account_type: "staff",
    },
  });
  if (error || !created.user) {
    return { ok: false, error: error?.message ?? "Could not create the user." };
  }

  // The on_auth_user_created trigger creates the profile; ensure it is correct.
  await admin
    .from("users")
    .update({
      full_name: input.full_name.trim(),
      role: input.role,
      is_active: true,
    })
    .eq("id", created.user.id);

  await logActivity({
    userId: user.id,
    action: "user.invited",
    entityType: "user",
    entityId: created.user.id,
    description: `Invited ${input.email} as ${input.role}`,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Edit a staff member's name (allowed for any user, including yourself). */
export async function updateUserName(
  userId: string,
  fullName: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can edit staff users." };
  }
  const name = fullName.trim();
  if (!name) return { ok: false, error: "Enter a name." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ full_name: name })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  // Keep the auth profile metadata in sync — best-effort.
  try {
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: name },
    });
  } catch {
    /* metadata sync is best-effort */
  }

  await logActivity({
    userId: user.id,
    action: "user.updated",
    entityType: "user",
    entityId: userId,
    description: `Name updated to ${name}`,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Change a staff member's role. */
export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can change roles." };
  }
  if (userId === user.id) {
    return { ok: false, error: "You cannot change your own role." };
  }
  if (!ROLES.includes(role as UserRole)) {
    return { ok: false, error: "Invalid role." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "user.role_changed",
    entityType: "user",
    entityId: userId,
    description: `Role changed to ${role}`,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Activate or deactivate a staff member's access. */
export async function toggleUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return { ok: false, error: "Only a Super Admin can manage staff users." };
  }
  if (userId === user.id) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: isActive ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
