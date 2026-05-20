import { NextResponse } from "next/server";
import { createSupabaseTokenClient } from "@/lib/supabase/token";
import type { UserRole } from "@/lib/types/database";

// ============================================================================
// Shared helpers for the /api/v1 REST API (consumed by the future mobile app).
// ============================================================================

export function apiJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, {
    status,
  });
}

export interface ApiPrincipal {
  mode: "service" | "user";
  userId?: string;
  role?: UserRole;
}

/**
 * Authorizes an API request. Accepts either:
 *  - `Authorization: Bearer <API_BEARER_SECRET>`  → service access
 *  - `Authorization: Bearer <supabase-access-token>` → authenticated user
 *
 * Returns the principal, or null when unauthorized.
 */
export async function authorizeApi(
  request: Request,
): Promise<ApiPrincipal | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) return null;

  // Service-to-service secret.
  const secret = process.env.API_BEARER_SECRET;
  if (secret && token === secret) {
    return { mode: "service" };
  }

  // Supabase user access token.
  try {
    const supabase = createSupabaseTokenClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      mode: "user",
      userId: user.id,
      role: (profile?.role as UserRole) ?? "viewer",
    };
  } catch {
    return null;
  }
}

/** Parse pagination params with sane defaults. */
export function parsePaging(url: URL) {
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  return { limit, page, from: (page - 1) * limit, to: (page - 1) * limit + limit - 1 };
}
