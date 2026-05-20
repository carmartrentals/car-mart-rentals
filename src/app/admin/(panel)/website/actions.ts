"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, canWrite, logActivity } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import type { PageSection } from "@/lib/website-content";

const PAGES = ["about", "faq", "terms", "privacy"];

export async function saveWebsitePage(
  key: string,
  sections: PageSection[],
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return { ok: false, error: "Only a Super Admin can edit website content." };
  }
  if (!PAGES.includes(key)) return { ok: false, error: "Invalid page." };

  const clean = sections
    .map((s) => ({ title: s.title.trim(), body: s.body.trim() }))
    .filter((s) => s.title || s.body);
  if (clean.length === 0) {
    return { ok: false, error: "Add at least one section of content." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("settings").upsert(
    {
      key: `page_${key}`,
      value: { sections: clean },
      category: "website",
    } as never,
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  await logActivity({
    userId: user.id,
    action: "website_page.updated",
    entityType: "settings",
    description: `Updated the ${key} page`,
  });
  revalidatePath(`/${key}`);
  revalidatePath("/admin/website");
  return { ok: true };
}
