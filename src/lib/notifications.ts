import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { getCompanyProfile } from "@/lib/data/settings";
import type { EmailTemplate } from "@/lib/types/database";

/** Replace {{variable}} placeholders in a template string. */
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

/** Minimal branded HTML wrapper for emails that have no rich template. */
function fallbackHtml(body: string, name: string, phone: string): string {
  return `<div style="font-family:Arial,sans-serif;color:#1f2029;line-height:1.6">
    <h2 style="color:#8b8f97">${name}</h2>
    <p>${body}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0"/>
    <p style="font-size:12px;color:#64748b">${name} · ${phone}</p>
  </div>`;
}

/**
 * Sends a templated notification and records it in the notifications table.
 * Best-effort: never throws, so it can be safely awaited inside any flow.
 */
export async function sendNotification(params: {
  type: string;
  templateKey: string;
  to: string;
  variables: Record<string, string>;
  reservationId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const company = await getCompanyProfile();

    const { data: tplRow } = await admin
      .from("email_templates")
      .select("*")
      .eq("key", params.templateKey)
      .eq("is_active", true)
      .maybeSingle();
    const tpl = tplRow as EmailTemplate | null;

    const subject = tpl
      ? render(tpl.subject, params.variables)
      : `${company.name} — ${params.type.replace(/_/g, " ")}`;
    const html = tpl
      ? render(tpl.body_html, params.variables)
      : fallbackHtml(
          `This is a ${params.type.replace(/_/g, " ")} notification.`,
          company.name,
          company.phone,
        );

    const result = await sendEmail({ to: params.to, subject, html });

    await admin.from("notifications").insert({
      type: params.type,
      channel: "email",
      recipient: params.to,
      subject,
      body: html,
      status: result.ok ? "sent" : result.skipped ? "pending" : "failed",
      reservation_id: params.reservationId ?? null,
      customer_id: params.customerId ?? null,
      error: result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  } catch (err) {
    // Notifications must never break the calling flow.
    console.error("sendNotification error:", err);
  }
}

/**
 * Sends an internal alert email to the company's own address — used for new
 * customer requests, contact-form enquiries and reviews. The recipient is the
 * email set in the company profile. Best-effort: never throws.
 */
export async function notifyCompany(params: {
  type: string;
  subject: string;
  lines: string[];
  reservationId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const company = await getCompanyProfile();
    const to = company.email;
    if (!to) return;

    const html = fallbackHtml(
      params.lines.filter(Boolean).join("<br/>"),
      company.name,
      company.phone,
    );
    const result = await sendEmail({ to, subject: params.subject, html });

    await admin.from("notifications").insert({
      type: params.type,
      channel: "email",
      recipient: to,
      subject: params.subject,
      body: html,
      status: result.ok ? "sent" : result.skipped ? "pending" : "failed",
      reservation_id: params.reservationId ?? null,
      customer_id: params.customerId ?? null,
      error: result.error ?? null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("notifyCompany error:", err);
  }
}
