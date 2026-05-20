import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User, UserRole } from "@/lib/types/database";

/**
 * Returns the signed-in admin/staff user profile, or null.
 * Profile rows are auto-created by the on_auth_user_created DB trigger.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  return (profile as User) ?? null;
}

/** Require an authenticated, active staff user — redirects to login otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.is_active) redirect("/admin/login?error=inactive");
  return user;
}

/** Require one of the given roles — redirects to the dashboard otherwise. */
export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/admin?error=forbidden");
  return user;
}

// --- Role / permission helpers ---------------------------------------------
const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  manager: 4,
  staff: 3,
  accountant: 2,
  viewer: 1,
};

/** True when `role` is at least as privileged as `min`. */
export function hasRank(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

type Module =
  | "vehicles" | "reservations" | "customers" | "checkinout"
  | "payments" | "reports" | "settings" | "users";

/** Can this role create/edit/delete in the given module? */
export function canWrite(role: UserRole, module: Module): boolean {
  if (role === "super_admin") return true;
  const matrix: Record<UserRole, Module[]> = {
    super_admin: [],
    manager: ["vehicles", "reservations", "customers", "checkinout", "payments"],
    staff: ["reservations", "customers", "checkinout"],
    accountant: ["payments"],
    viewer: [],
  };
  return matrix[role].includes(module);
}

/** Record an entry in the activity log (best-effort, never throws). */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      user_id: params.userId ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      description: params.description ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Logging must never break a request.
  }
}
