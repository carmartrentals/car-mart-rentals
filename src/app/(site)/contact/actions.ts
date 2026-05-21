"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCompany } from "@/lib/notifications";
import type { ActionState } from "@/lib/form";

/**
 * Public contact-form submission. Recorded as a website lead so it appears
 * in the admin Leads page for follow-up.
 */
export async function submitContactForm(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): Promise<ActionState> {
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!email && !phone) {
    return { ok: false, error: "Please enter an email or phone number." };
  }
  if (!message) return { ok: false, error: "Please enter a message." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("leads").insert({
      name,
      email: email || null,
      phone: phone || null,
      message,
      source: "website",
      status: "new",
    });
    if (error) return { ok: false, error: error.message };

    await notifyCompany({
      type: "website_enquiry",
      subject: `New website enquiry - ${name}`,
      heading: "New Website Enquiry",
      intro: `${name} sent a message through the website contact form. It has also been added to your Leads page.`,
      rows: [
        { label: "Name", value: name },
        ...(email ? [{ label: "Email", value: email }] : []),
        ...(phone ? [{ label: "Phone", value: phone }] : []),
        { label: "Message", value: message },
      ],
      cta: { label: "View in Leads", path: "/admin/leads" },
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not send your message.",
    };
  }
}
