import type { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentStatus } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Human-readable labels for each verification status. */
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Action needed",
};

/** Badge tone for each verification status. */
export const DOCUMENT_STATUS_TONE: Record<
  DocumentStatus,
  "green" | "amber" | "red" | "gray"
> = {
  not_submitted: "gray",
  pending: "amber",
  verified: "green",
  rejected: "red",
};

/** True when a date string is in the past (document has expired). */
export function isExpired(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

/**
 * Recompute the legacy `documents_verified` flag from the two per-document
 * statuses. Kept in sync so older reads (dashboard, lists) stay correct.
 */
export async function syncDocumentsVerified(
  admin: Admin,
  customerId: string,
): Promise<void> {
  const { data } = await admin
    .from("customers")
    .select("dl_status, insurance_status")
    .eq("id", customerId)
    .maybeSingle();
  if (!data) return;
  const verified =
    data.dl_status === "verified" && data.insurance_status === "verified";
  await admin
    .from("customers")
    .update({ documents_verified: verified })
    .eq("id", customerId);
}
