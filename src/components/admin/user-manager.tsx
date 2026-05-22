"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { USER_ROLES } from "@/lib/constants";
import {
  inviteUser, updateUserRole, toggleUserActive, updateUserName,
} from "@/app/admin/(panel)/users/actions";
import type { User, UserRole } from "@/lib/types/database";

const ROLES: UserRole[] = ["super_admin", "manager", "staff", "accountant", "viewer"];

const EMPTY = {
  email: "",
  full_name: "",
  role: "staff" as UserRole,
  password: "",
};

export function UserManager({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [editError, setEditError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function invite() {
    setError(null);
    startTransition(async () => {
      const res = await inviteUser(form);
      if (res.ok) {
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not invite the user.");
      }
    });
  }

  function changeRole(userId: string, role: string) {
    startTransition(async () => {
      await updateUserRole(userId, role);
      router.refresh();
    });
  }

  function toggleActive(userId: string, isActive: boolean) {
    startTransition(async () => {
      await toggleUserActive(userId, isActive);
      router.refresh();
    });
  }

  function saveEdit() {
    if (!editing) return;
    setEditError(null);
    startTransition(async () => {
      const res = await updateUserName(editing.id, editing.name);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      } else {
        setEditError(res.error ?? "Could not update the name.");
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {users.length} staff member(s)
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Invite Staff
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Added</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <TR key={u.id}>
                <TD className="font-medium text-slate-800">
                  {u.full_name || "—"}
                  {isSelf && (
                    <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                  )}
                </TD>
                <TD className="text-slate-600">{u.email}</TD>
                <TD>
                  {isSelf ? (
                    <Badge tone="indigo">{USER_ROLES[u.role]}</Badge>
                  ) : (
                    <select
                      value={u.role}
                      disabled={pending}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-gold-500 focus:outline-none disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{USER_ROLES[r]}</option>
                      ))}
                    </select>
                  )}
                </TD>
                <TD>
                  {isSelf ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <button
                      onClick={() => toggleActive(u.id, !u.is_active)}
                      disabled={pending}
                    >
                      <Badge tone={u.is_active ? "green" : "gray"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  )}
                </TD>
                <TD className="text-slate-500">{formatDate(u.created_at)}</TD>
                <TD className="text-right">
                  <button
                    onClick={() =>
                      setEditing({ id: u.id, name: u.full_name || "" })
                    }
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Staff Member"
        description="Creates a login for a new team member."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={invite} loading={pending}>Create Account</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Full Name" required>
            <Input value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={form.role}
              onChange={(e) => set("role", e.target.value as UserRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{USER_ROLES[r]}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Temporary Password"
            required
            hint="Share this with the staff member — they can change it later."
          >
            <Input value={form.password}
              onChange={(e) => set("password", e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Staff Member"
        description="Update the name shown for this team member."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={pending}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          {editError && <Alert tone="error">{editError}</Alert>}
          <Field label="Full Name" required>
            <Input
              value={editing?.name ?? ""}
              onChange={(e) =>
                setEditing((p) => (p ? { ...p, name: e.target.value } : p))
              }
            />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
