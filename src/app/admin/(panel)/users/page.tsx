import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { UserManager } from "@/components/admin/user-manager";
import { Alert } from "@/components/ui/misc";
import type { User } from "@/lib/types/database";

export default async function UsersPage() {
  const currentUser = await requireRole(["super_admin"]);

  let users: User[] = [];
  let configError = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("users")
      .select("*")
      .order("created_at");
    users = (data as User[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Staff Users"
        subtitle="Invite team members and control their roles and access."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load staff users. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <UserManager users={users} currentUserId={currentUser.id} />
    </>
  );
}
