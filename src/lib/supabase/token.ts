import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client bound to a specific user access token.
 * Used by the REST API to act as the calling user (RLS applies).
 */
export function createSupabaseTokenClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
