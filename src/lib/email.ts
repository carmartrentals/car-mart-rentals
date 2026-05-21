/**
 * Email sending — SERVER ONLY.
 *
 * Supports two providers, chosen automatically from environment variables:
 *   1. SMTP (e.g. Hostinger) — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   2. Resend API            — set RESEND_API_KEY
 * If neither is configured, sends are skipped gracefully so nothing breaks.
 */

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

const FROM_NAME = "Car Mart Rentals";

export function emailConfigured(): boolean {
  return Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER) ||
      process.env.RESEND_API_KEY,
  );
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  // --- 1. SMTP (Hostinger or any mailbox) -----------------------------------
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const { default: nodemailer } = await import("nodemailer");
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // 465 = SSL, 587 = STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
      });
      await transporter.sendMail({
        from: `${FROM_NAME} <${process.env.SMTP_USER}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "SMTP send failed.",
      };
    }
  }

  // --- 2. Resend API --------------------------------------------------------
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true, error: "Email provider not configured." };
  }
  const from = process.env.EMAIL_FROM || "contact@carmartrentals.com";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${from}>`,
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
