"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { ExpenseCategory, PaymentMethod } from "@/lib/types/database";

export async function createExpense(input: {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  vehicle_id: string;
  odometer: string;
  vendor: string;
  payment_method: PaymentMethod;
  notes: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "payments")) {
    return { ok: false, error: "You do not have permission to record expenses." };
  }
  if (!input.description.trim()) return { ok: false, error: "Enter a description." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("expenses").insert({
    category: input.category,
    description: input.description.trim(),
    amount: input.amount,
    expense_date: input.expense_date || new Date().toISOString().slice(0, 10),
    vehicle_id: input.vehicle_id || null,
    odometer: input.odometer ? Number(input.odometer) : null,
    vendor: input.vendor.trim() || null,
    payment_method: input.payment_method,
    notes: input.notes.trim() || null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "expense.created",
    entityType: "expense",
    description: `Recorded ${input.category} expense of ${input.amount}`,
  });
  revalidatePath("/admin/expenses");
  return { ok: true };
}
