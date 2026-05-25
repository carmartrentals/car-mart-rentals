import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open-tracking pixel. The marketing email embeds:
 *   <img src=".../api/marketing/track/<recipientId>/open.gif" />
 * When the recipient's email client loads the image, we record the
 * opened_at timestamp + bump open_count + bump the campaign's
 * opened_count. Always returns a 1x1 transparent gif regardless of
 * whether the record was found, so tracking failures don't leave
 * broken-image icons in the inbox.
 */

// Minimal 43-byte transparent GIF.
const PIXEL = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

function pixelResponse() {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      // Critical — email clients (especially Gmail) cache images aggressively.
      // If we don't disable cache, only the FIRST open is reported even when
      // the user re-opens the email later.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return pixelResponse();

  try {
    const admin = createAdminClient();
    // Load the recipient so we know whether this is the first open + which
    // campaign to bump. Fire-and-forget on failures — tracking is best-effort.
    const { data } = await admin
      .from("marketing_recipients")
      .select("id, campaign_id, opened_at, open_count")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      const row = data as {
        id: string;
        campaign_id: string;
        opened_at: string | null;
        open_count: number;
      };
      const firstOpen = !row.opened_at;
      await admin
        .from("marketing_recipients")
        .update({
          opened_at: row.opened_at ?? new Date().toISOString(),
          open_count: (row.open_count ?? 0) + 1,
        })
        .eq("id", id);
      if (firstOpen) {
        // Bump the campaign's opened_count. Race-safe-enough for a small
        // operator — true atomicity isn't needed here.
        const { data: camp } = await admin
          .from("marketing_campaigns")
          .select("opened_count")
          .eq("id", row.campaign_id)
          .maybeSingle();
        const current = Number(
          (camp as { opened_count?: number } | null)?.opened_count ?? 0,
        );
        await admin
          .from("marketing_campaigns")
          .update({ opened_count: current + 1 })
          .eq("id", row.campaign_id);
      }
    }
  } catch {
    /* tracking is best-effort */
  }
  return pixelResponse();
}
