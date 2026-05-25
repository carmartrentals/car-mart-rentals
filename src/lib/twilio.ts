/**
 * Twilio helpers — SERVER ONLY.
 *
 * Configure these env vars on Vercel:
 *   TWILIO_ACCOUNT_SID    — starts with AC...
 *   TWILIO_AUTH_TOKEN     — from Account Info page
 *   TWILIO_PHONE_NUMBER   — E.164 format, e.g. +18184655961
 *   OWNER_PHONE_NUMBER    — your real cell phone for call transfers, E.164
 */

import twilio from "twilio";

let cached: ReturnType<typeof twilio> | null = null;

export function getTwilio() {
  if (cached) return cached;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
    );
  }
  cached = twilio(sid, token);
  return cached;
}

export function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );
}

export function twilioPhoneNumber(): string | null {
  return process.env.TWILIO_PHONE_NUMBER || null;
}

export function ownerPhoneNumber(): string | null {
  return process.env.OWNER_PHONE_NUMBER || null;
}

/**
 * Verify a Twilio webhook signature so random people on the internet can't
 * trigger our AI receptionist (which costs money per call).
 *
 * Twilio computes an HMAC of (full URL + sorted form params) using our auth
 * token. On Vercel, `request.url` can be the internal routing URL instead
 * of the public URL Twilio actually called — which breaks the HMAC. We try
 * the request URL first, then fall back to a reconstructed URL using the
 * x-forwarded-proto + host headers (matches what Twilio actually saw).
 */
export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
  headers?: Headers,
): boolean {
  if (!signature) return false;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  const candidates: string[] = [url];

  // Reconstruct from headers — this is what Twilio actually called.
  if (headers) {
    const proto = headers.get("x-forwarded-proto") || "https";
    const host = headers.get("host");
    if (host) {
      try {
        const pathAndQuery = new URL(url).pathname + new URL(url).search;
        candidates.push(`${proto}://${host}${pathAndQuery}`);
      } catch {
        /* ignore malformed url */
      }
    }
  }

  for (const candidate of candidates) {
    try {
      if (twilio.validateRequest(token, signature, candidate, params)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

/** Send an SMS — used by the AI receptionist to text booking links. */
export async function sendSms(
  to: string,
  body: string,
): Promise<{ sid: string; status: string }> {
  const from = twilioPhoneNumber();
  if (!from) throw new Error("TWILIO_PHONE_NUMBER is not set.");
  const result = await getTwilio().messages.create({ to, from, body });
  return { sid: result.sid, status: result.status };
}
