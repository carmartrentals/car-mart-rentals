import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Summary of a Stripe Identity verification, built from data the standard
 * secret key is allowed to read. The ID photos, selfie image and Stripe's
 * fraud/network analysis are privacy-restricted and live only in the Stripe
 * dashboard — so we surface a deep link to the full report instead.
 */
export interface IdentitySummary {
  sessionId: string;
  dashboardUrl: string;
  status: string;
  documentType: string | null;
  issuingCountry: string | null;
  documentStatus: string | null;
  documentError: string | null;
  selfieStatus: string | null;
  selfieError: string | null;
  verifiedName: string | null;
}

/** Pretty label for a Stripe Identity document type. */
export function prettyDocumentType(type: string | null): string | null {
  if (!type) return null;
  const map: Record<string, string> = {
    driving_license: "Driver License",
    passport: "Passport",
    id_card: "Identity Card",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

/** Fetch a verification-session summary for display on the customer page. */
export async function getIdentitySummary(
  sessionId: string,
): Promise<IdentitySummary | null> {
  if (!stripeConfigured() || !sessionId) return null;

  const isTest = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test");
  const dashboardUrl = `https://dashboard.stripe.com/${
    isTest ? "test/" : ""
  }identity/verification-sessions/${sessionId}`;

  try {
    const session = await getStripe().identity.verificationSessions.retrieve(
      sessionId,
      { expand: ["last_verification_report", "verified_outputs"] },
    );
    const report =
      session.last_verification_report &&
      typeof session.last_verification_report !== "string"
        ? session.last_verification_report
        : null;
    const document = report?.document ?? null;
    const selfie = report?.selfie ?? null;
    const outputs = session.verified_outputs ?? null;
    const verifiedName = outputs
      ? [outputs.first_name, outputs.last_name].filter(Boolean).join(" ") || null
      : null;

    return {
      sessionId,
      dashboardUrl,
      status: session.status,
      documentType: document?.type ?? null,
      issuingCountry: document?.issuing_country ?? null,
      documentStatus: document?.status ?? null,
      documentError: document?.error?.reason ?? null,
      selfieStatus: selfie?.status ?? null,
      selfieError: selfie?.error?.reason ?? null,
      verifiedName,
    };
  } catch {
    // Couldn't load the report (e.g. key permissions) — still give the link.
    return {
      sessionId,
      dashboardUrl,
      status: "unknown",
      documentType: null,
      issuingCountry: null,
      documentStatus: null,
      documentError: null,
      selfieStatus: null,
      selfieError: null,
      verifiedName: null,
    };
  }
}
