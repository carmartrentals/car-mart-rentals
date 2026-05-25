"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getCompanyProfile } from "@/lib/data/settings";
import { SITE_URL } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import type { Customer, PromoCode } from "@/lib/types/database";

interface CampaignDraft {
  name: string;
  subject: string;
  preheader: string;
  body: string;
  cta_label: string;
  cta_url: string;
  promo_code_id: string | null;
}

async function requireMarketingAccess() {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) return null;
  return user;
}

/**
 * Create a marketing campaign + immediately blast it to every eligible
 * customer. "Eligible" = has an email + isn't marketing_opted_out.
 *
 * Sends are throttled to a small batch concurrency so we don't trip
 * Resend's rate limit (10 req/sec on the free tier) and so a partial
 * failure doesn't take down the whole campaign.
 */
export async function createAndSendCampaign(
  input: CampaignDraft,
): Promise<ActionState> {
  const user = await requireMarketingAccess();
  if (!user) {
    return {
      ok: false,
      error: "Only a Super Admin can send marketing campaigns.",
    };
  }
  if (!input.name.trim() || !input.subject.trim() || !input.body.trim()) {
    return { ok: false, error: "Name, subject, and body are all required." };
  }

  const admin = createAdminClient();

  // 1) Create the campaign row in "sending" status.
  const { data: created, error: cErr } = await admin
    .from("marketing_campaigns")
    .insert({
      name: input.name.trim(),
      subject: input.subject.trim(),
      preheader: input.preheader.trim() || null,
      body: input.body.trim(),
      cta_label: input.cta_label.trim() || null,
      cta_url: input.cta_url.trim() || null,
      promo_code_id: input.promo_code_id || null,
      status: "sending",
      created_by: user.id,
    })
    .select("*")
    .single();
  if (cErr || !created) {
    return { ok: false, error: cErr?.message ?? "Could not create campaign." };
  }
  const campaignId = (created as { id: string }).id;

  // 2) Load eligible recipients.
  const { data: customersData } = await admin
    .from("customers")
    .select("id, first_name, email, marketing_opted_out, is_blacklisted")
    .not("email", "is", null)
    .eq("marketing_opted_out", false)
    .eq("is_blacklisted", false);
  const recipients = (customersData ?? []) as Pick<
    Customer,
    "id" | "first_name" | "email" | "marketing_opted_out" | "is_blacklisted"
  >[];

  // Dedupe by lowercased email so we don't double-send to the same address
  // if there happen to be two customer rows sharing one inbox.
  const seen = new Set<string>();
  const unique = recipients.filter((r) => {
    if (!r.email) return false;
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    await admin
      .from("marketing_campaigns")
      .update({ status: "failed" })
      .eq("id", campaignId);
    return {
      ok: false,
      error:
        "No eligible recipients (customers must have an email + not be opted out + not blacklisted).",
    };
  }

  // 3) Look up promo + company once for the email body.
  let promo: PromoCode | null = null;
  if (input.promo_code_id) {
    const { data } = await admin
      .from("promo_codes")
      .select("*")
      .eq("id", input.promo_code_id)
      .maybeSingle();
    promo = (data as PromoCode | null) ?? null;
  }
  const company = await getCompanyProfile();

  // 4) Insert recipient rows in bulk (so we have IDs to track opens with),
  //    then send the emails — using the recipient ID as the tracking token.
  const recipientRows = unique.map((r) => ({
    campaign_id: campaignId,
    customer_id: r.id,
    email: r.email!,
  }));
  const { data: insertedRows, error: rErr } = await admin
    .from("marketing_recipients")
    .insert(recipientRows)
    .select("id, customer_id, email");
  if (rErr || !insertedRows) {
    await admin
      .from("marketing_campaigns")
      .update({ status: "failed" })
      .eq("id", campaignId);
    return {
      ok: false,
      error: rErr?.message ?? "Could not create recipient list.",
    };
  }

  // Stitch first_name back to each inserted row for personalization.
  const byCustomerId = new Map(unique.map((u) => [u.id, u.first_name]));
  const sendList = insertedRows.map((row) => ({
    id: (row as { id: string }).id,
    customer_id: (row as { customer_id: string | null }).customer_id,
    email: (row as { email: string }).email,
    first_name:
      byCustomerId.get((row as { customer_id: string | null }).customer_id ?? "") ??
      "",
  }));

  // 5) Send in small concurrent batches so a slow recipient doesn't block
  //    the rest and Resend rate limits stay happy.
  let sent = 0;
  let failed = 0;
  const BATCH = 5;
  for (let i = 0; i < sendList.length; i += BATCH) {
    const slice = sendList.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      slice.map(async (r) => {
        const html = buildCampaignHtml({
          recipientId: r.id,
          firstName: r.first_name || "there",
          subject: input.subject,
          preheader: input.preheader,
          body: input.body,
          ctaLabel: input.cta_label,
          ctaUrl: input.cta_url,
          promo,
          companyName: company.name,
          companyAddress: company.address,
        });
        const result = await sendEmail({
          to: r.email,
          subject: input.subject.trim(),
          html,
        });
        if (!result.ok) {
          throw new Error(result.error || "Send failed.");
        }
      }),
    );

    // Mark each row sent or failed.
    const updates = slice.map((r, idx) => {
      const settled = results[idx];
      if (settled.status === "fulfilled") {
        sent++;
        return admin
          .from("marketing_recipients")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", r.id);
      }
      failed++;
      const reason =
        settled.status === "rejected"
          ? settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason)
          : "unknown error";
      return admin
        .from("marketing_recipients")
        .update({ send_error: reason })
        .eq("id", r.id);
    });
    await Promise.allSettled(updates);
  }

  // 6) Finalize the campaign row.
  await admin
    .from("marketing_campaigns")
    .update({
      status: failed === sendList.length ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
    })
    .eq("id", campaignId);

  await logActivity({
    userId: user.id,
    action: "marketing.campaign_sent",
    entityType: "marketing_campaign",
    entityId: campaignId,
    description: `${input.name} · sent to ${sent}, failed ${failed}`,
  });

  revalidatePath("/admin/marketing");
  return { ok: true, data: { campaignId, sent, failed } };
}

// ----- Email HTML builder ---------------------------------------------------
// Lightweight branded template — matches the look of the existing
// transactional emails (dark gold header, soft body) and injects the
// tracking pixel + CAN-SPAM unsubscribe footer.

function buildCampaignHtml(args: {
  recipientId: string;
  firstName: string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  promo: PromoCode | null;
  companyName: string;
  companyAddress: string;
}): string {
  const trackPixel = `${SITE_URL}/api/marketing/track/${args.recipientId}/open.gif`;
  const unsubscribeUrl = `${SITE_URL}/api/marketing/unsubscribe/${args.recipientId}`;

  // Promo highlight block, only when a code is attached.
  const promoBlock = args.promo
    ? `
    <div style="margin: 24px 0; padding: 20px; border: 2px dashed #cbced4; background: #fafafa; text-align: center; border-radius: 12px;">
      <div style="font-size: 11px; letter-spacing: 1px; color: #6b6f75; text-transform: uppercase; font-weight: 600;">
        Use code
      </div>
      <div style="margin-top: 8px; font-size: 28px; letter-spacing: 4px; font-weight: 700; color: #1a1d23;">
        ${escapeHtml(args.promo.code)}
      </div>
      <div style="margin-top: 6px; font-size: 13px; color: #4b5563;">
        ${
          args.promo.discount_type === "percentage"
            ? `${args.promo.discount_value}% off`
            : `$${args.promo.discount_value.toFixed(2)} off`
        }${args.promo.description ? ` — ${escapeHtml(args.promo.description)}` : ""}
      </div>
    </div>`
    : "";

  // Body paragraphs — split on blank lines so a textarea can format
  // naturally without needing the operator to write HTML.
  const bodyHtml = args.body
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin: 0 0 16px; line-height: 1.55; color: #1f2937;">${escapeHtml(p.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");

  const ctaHtml =
    args.ctaLabel && args.ctaUrl
      ? `
    <div style="text-align: center; margin: 28px 0 8px;">
      <a href="${escapeAttr(args.ctaUrl)}"
         style="display: inline-block; background: #1a1d23; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
        ${escapeHtml(args.ctaLabel)}
      </a>
    </div>`
      : "";

  const preheaderHtml = args.preheader
    ? `<div style="display:none; max-height:0; overflow:hidden;">${escapeHtml(args.preheader)}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.subject)}</title>
</head>
<body style="margin:0; padding:0; background:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#1a1d23; padding:20px 28px; color:#cbced4; font-weight:600; letter-spacing:1px; text-transform:uppercase; font-size:12px;">
            ${escapeHtml(args.companyName)}
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 12px;">
            <p style="margin:0 0 18px; font-size:15px; color:#374151;">
              Hi ${escapeHtml(args.firstName)},
            </p>
            ${bodyHtml}
            ${promoBlock}
            ${ctaHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px; border-top:1px solid #eef0f3; font-size:12px; color:#6b7280;">
            <p style="margin:0 0 6px;">
              ${escapeHtml(args.companyName)} · ${escapeHtml(args.companyAddress)}
            </p>
            <p style="margin:0;">
              <a href="${escapeAttr(unsubscribeUrl)}" style="color:#6b7280; text-decoration:underline;">
                Unsubscribe from marketing emails
              </a>
            </p>
          </td>
        </tr>
      </table>
      <!-- Open-tracking pixel (1x1 transparent gif). Loading this URL
           is what records the open in the marketing_recipients table. -->
      <img src="${trackPixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/** Delete a campaign + cascade its recipients. Used from the admin list. */
export async function deleteCampaign(id: string): Promise<ActionState> {
  const user = await requireMarketingAccess();
  if (!user) return { ok: false, error: "Permission denied." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketing_campaigns")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity({
    userId: user.id,
    action: "marketing.campaign_deleted",
    entityType: "marketing_campaign",
    entityId: id,
    description: "Campaign deleted",
  });
  revalidatePath("/admin/marketing");
  return { ok: true };
}
