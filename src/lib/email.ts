/**
 * Email sending — SERVER ONLY.
 *
 * Provider-agnostic. Currently wired to Resend via its REST API (no SDK
 * dependency). If RESEND_API_KEY is not set, sends are skipped gracefully and
 * the notification is still logged as "pending" so nothing breaks.
 */

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "contact@carmartrentals.com";

  if (!apiKey) {
    return { ok: false, skipped: true, error: "Email provider not configured." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Car Mart Rentals <${from}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `Email send failed (${res.status}): ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email error." };
  }
}
