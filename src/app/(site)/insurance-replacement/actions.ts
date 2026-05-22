"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCompany, notifyCustomer } from "@/lib/notifications";
import type { ActionState } from "@/lib/form";

export interface InsuranceIntakeInput {
  contactName: string;
  companyName: string;
  role: string;
  email: string;
  phone: string;
  driverName: string;
  driverPhone: string;
  insuranceCompany: string;
  claimNumber: string;
  adjusterName: string;
  vehicleClass: string;
  startDate: string;
  duration: string;
  notes: string;
}

/**
 * Public insurance-replacement intake — body shops and adjusters submit a
 * replacement-rental request for their client. Saved as a lead and emailed
 * to the company for follow-up.
 */
export async function submitInsuranceIntake(
  input: InsuranceIntakeInput,
): Promise<ActionState> {
  const v = (s: string) => (s ?? "").trim();
  const contactName = v(input.contactName);
  const email = v(input.email);
  const phone = v(input.phone);
  const driverName = v(input.driverName);

  if (!contactName) return { ok: false, error: "Please enter your name." };
  if (!email && !phone) {
    return { ok: false, error: "Please enter an email or phone number." };
  }
  if (!driverName) {
    return { ok: false, error: "Please enter the driver's name." };
  }

  const rows: { label: string; value: string }[] = [
    { label: "Submitted by", value: contactName },
    ...(v(input.companyName)
      ? [{ label: "Company / shop", value: v(input.companyName) }]
      : []),
    ...(v(input.role) ? [{ label: "Role", value: v(input.role) }] : []),
    ...(email ? [{ label: "Email", value: email }] : []),
    ...(phone ? [{ label: "Phone", value: phone }] : []),
    { label: "Driver", value: driverName },
    ...(v(input.driverPhone)
      ? [{ label: "Driver phone", value: v(input.driverPhone) }]
      : []),
    ...(v(input.insuranceCompany)
      ? [{ label: "Insurance company", value: v(input.insuranceCompany) }]
      : []),
    ...(v(input.claimNumber)
      ? [{ label: "Claim #", value: v(input.claimNumber) }]
      : []),
    ...(v(input.adjusterName)
      ? [{ label: "Adjuster", value: v(input.adjusterName) }]
      : []),
    ...(v(input.vehicleClass)
      ? [{ label: "Vehicle class needed", value: v(input.vehicleClass) }]
      : []),
    ...(v(input.startDate)
      ? [{ label: "Estimated start", value: v(input.startDate) }]
      : []),
    ...(v(input.duration)
      ? [{ label: "Estimated duration", value: v(input.duration) }]
      : []),
    ...(v(input.notes) ? [{ label: "Notes", value: v(input.notes) }] : []),
  ];

  const message =
    "INSURANCE-REPLACEMENT INTAKE\n" +
    rows.map((r) => `${r.label}: ${r.value}`).join("\n");

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("leads").insert({
      name: contactName,
      email: email || null,
      phone: phone || null,
      message,
      source: "website",
      status: "new",
    });
    if (error) return { ok: false, error: error.message };

    await notifyCompany({
      type: "insurance_replacement_intake",
      subject: `🛟 Insurance-replacement request — ${driverName}`,
      heading: "Insurance-Replacement Request",
      intro: `${contactName} submitted an insurance-replacement rental request. It has also been added to your Leads page for follow-up.`,
      rows,
      cta: { label: "View in Leads", path: "/admin/leads" },
    });

    if (email) {
      await notifyCustomer({
        type: "insurance_replacement_received",
        to: email,
        subject: "We received your insurance-replacement request",
        heading: "Request Received",
        intro: `Hi ${contactName}, thank you — we've received your insurance-replacement rental request for ${driverName}. Our team will review the details and contact you shortly to arrange the vehicle.`,
        rows: [
          { label: "Driver", value: driverName },
          ...(v(input.claimNumber)
            ? [{ label: "Claim #", value: v(input.claimNumber) }]
            : []),
        ],
        cta: { label: "Visit Our Website", path: "/" },
      });
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not submit your request.",
    };
  }
}
