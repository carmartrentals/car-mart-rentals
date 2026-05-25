/**
 * Shared-secret authentication for the Twilio bridge service. The bridge
 * sends `x-bridge-secret` with every callback; we compare in constant time
 * to the BRIDGE_SECRET env var.
 */
import { timingSafeEqual } from "node:crypto";

export function verifyBridgeSecret(provided: string | null): boolean {
  const expected = process.env.BRIDGE_SECRET || "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
