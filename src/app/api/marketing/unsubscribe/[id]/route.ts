import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe. The recipient ID in the URL is treated as the
 * unsubscribe token — already unguessable (uuid) + scoped to a single
 * customer. Marks the linked customer as marketing_opted_out so the
 * send action skips them on future campaigns. Always returns 200 with
 * a confirmation page so the link doesn't appear "broken".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return new NextResponse(htmlPage("Invalid link."), htmlHeaders());

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("marketing_recipients")
      .select("customer_id, email")
      .eq("id", id)
      .maybeSingle();
    const row = data as { customer_id: string | null; email: string } | null;
    if (row?.customer_id) {
      await admin
        .from("customers")
        .update({
          marketing_opted_out: true,
          marketing_opted_out_at: new Date().toISOString(),
        })
        .eq("id", row.customer_id);
    }
    return new NextResponse(
      htmlPage(
        row?.email
          ? `${row.email} has been unsubscribed from marketing emails. You'll still receive transactional emails about your reservations.`
          : "You have been unsubscribed.",
      ),
      htmlHeaders(),
    );
  } catch {
    return new NextResponse(
      htmlPage(
        "We hit an error processing the unsubscribe. Please reply to any marketing email and we'll opt you out manually.",
      ),
      htmlHeaders(),
    );
  }
}

function htmlHeaders() {
  return { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } };
}

function htmlPage(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Unsubscribed</title>
  <style>
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; background:#0f1115; color:#cbced4; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
    .card { max-width:480px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:32px; border-radius:16px; }
    h1 { margin:0 0 12px; font-size:20px; color:#fff; }
    p { margin:0; line-height:1.6; font-size:15px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribed</h1>
    <p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  </div>
</body>
</html>`;
}
