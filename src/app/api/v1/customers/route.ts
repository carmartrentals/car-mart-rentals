import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiJson, apiError, authorizeApi, parsePaging } from "@/lib/api";

/** GET /api/v1/customers — authenticated. Query: q, page, limit. */
export async function GET(request: Request) {
  const principal = await authorizeApi(request);
  if (!principal) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const { limit, page, from, to } = parsePaging(url);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  let query = admin.from("customers").select("*", { count: "exact" });
  const q = url.searchParams.get("q");
  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return apiError(error.message, 500);
  return apiJson({
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0 },
  });
}

const createSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  dl_number: z.string().max(40).optional(),
  dl_state: z.string().max(20).optional(),
});

/** POST /api/v1/customers — authenticated. Creates a customer. */
export async function POST(request: Request) {
  const principal = await authorizeApi(request);
  if (!principal) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return apiError("Service unavailable", 503);
  }

  const { data, error } = await admin
    .from("customers")
    .insert({ ...parsed.data, email: parsed.data.email.toLowerCase() })
    .select("*")
    .single();

  if (error) return apiError(error.message, 500);
  return apiJson({ data }, 201);
}
