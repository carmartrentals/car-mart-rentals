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

// --- Company alert emails ---------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolves the site's base URL from the current request, when available. */
async function siteBaseUrl(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("host");
    if (host) {
      return `${host.includes("localhost") ? "http" : "https"}://${host}`;
    }
  } catch {
    /* not inside a request scope */
  }
  return "";
}

/** Builds a clean, branded HTML email for an internal company alert. */
function companyEmailHtml(opts: {
  companyName: string;
  companyPhone: string;
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const rows = opts.rows
    .map(
      (r) => `<tr>
            <td style="padding:11px 16px;border-bottom:1px solid #eef0f2;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;vertical-align:top;white-space:nowrap;">${escapeHtml(r.label)}</td>
            <td style="padding:11px 16px;border-bottom:1px solid #eef0f2;font-size:14px;color:#0b0c11;font-weight:600;">${escapeHtml(r.value)}</td>
          </tr>`,
    )
    .join("");

  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<div style="margin-top:24px;">
            <a href="${opts.ctaUrl}" style="display:inline-block;background:#0b0c11;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:8px;">${escapeHtml(opts.ctaLabel)}</a>
          </div>`
      : "";

  return `<div style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0b0c11;padding:22px 28px;text-align:center;">
          <div style="color:#ffffff;font-size:20px;font-weight:bold;">${escapeHtml(opts.companyName)}</div>
          <div style="color:#a9aeb7;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin-top:5px;">Admin Notification</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 6px;font-size:20px;color:#0b0c11;">${escapeHtml(opts.heading)}</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(opts.intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f2;border-radius:8px;border-collapse:separate;">
            ${rows}
          </table>
          ${cta}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">${escapeHtml(opts.companyName)} &middot; ${escapeHtml(opts.companyPhone)}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Automated notification from your Car Mart Rentals system.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

/**
 * Sends a clean, branded alert email to the company's own address — used for
 * new bookings, customer requests, enquiries and reviews. The recipient is the
 * email set in the company profile. Best-effort: never throws.
 */
export async function notifyCompany(params: {
  type: string;
  subject: string;
  heading: string;
  intro: string;
  rows: { label: string; value: string }[];
  cta?: { label: string; path: string };
  reservationId?: string | null;
  customerId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const company = await getCompanyProfile();
    const to = company.email;
    if (!to) return;

    let ctaUrl: string | undefined;
    if (params.cta) {
      const base = await siteBaseUrl();
      if (base) ctaUrl = base + params.cta.path;
    }

    const html = companyEmailHtml({
      companyName: company.name,
      companyPhone: company.phone,
      heading: params.heading,
      intro: params.intro,
      rows: params.rows,
      ctaLabel: params.cta?.label,
      ctaUrl,
    });

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
