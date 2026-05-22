import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP for rate-limit keying. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Simple sliding-window rate limiter backed by the rate_limit_hits table.
 * Returns true when the request is allowed, false when the limit is hit.
 * Fails open — a database error never blocks legitimate traffic.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count } = await admin
      .from("rate_limit_hits")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .gte("created_at", since);

    if ((count ?? 0) >= limit) return false;

    await admin.from("rate_limit_hits").insert({ bucket });

    // Opportunistic cleanup of old rows so the table stays small.
    if (Math.random() < 0.03) {
      const cutoff = new Date(Date.now() - 86_400_000).toISOString();
      await admin.from("rate_limit_hits").delete().lt("created_at", cutoff);
    }
    return true;
  } catch {
    return true;
  }
}
