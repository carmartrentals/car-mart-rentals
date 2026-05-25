import OpenAI from "openai";
import { getOpenAI, aiConfigured } from "@/lib/ai";

/**
 * AI proof-of-insurance inspector. Takes the uploaded insurance card / dec
 * page image and asks gpt-4o-mini-vision to:
 *   1. Score authenticity 0-100
 *   2. Cross-check the named insured against the customer record
 *   3. Surface red flags (expired, name mismatch, fake doc, low coverage)
 *   4. Extract the company, policy number, effective + expiration dates
 */

export interface InsuranceAiInspection {
  score: number;
  flags: string[];
  summary: string;
  extracted?: {
    company?: string | null;
    policyNumber?: string | null;
    namedInsured?: string | null;
    effectiveDate?: string | null;
    expirationDate?: string | null;
  };
}

const VISION_MODEL = "gpt-4o-mini";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (type.includes("pdf")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function describeInsuranceFlag(code: string): string {
  const map: Record<string, string> = {
    expired: "Policy is expired",
    expiring_soon: "Policy expires within 14 days",
    name_mismatch: "Named insured does not match customer record",
    insufficient_coverage: "Coverage limits appear low for a rental",
    liability_only: "Liability-only — no comprehensive/collision",
    not_an_insurance_doc: "Image does not appear to be an insurance document",
    vehicle_specific:
      "Policy is for a specific vehicle — may not extend to rentals",
    photo_quality_low: "Image is blurry or low resolution",
    photo_tampered: "Image shows signs of digital editing",
    international: "International insurance — verify acceptance",
    no_dates_visible: "Effective and expiration dates not visible",
  };
  return map[code] || code.replace(/_/g, " ");
}

export async function inspectInsurancePhoto(args: {
  documentUrl: string;
  expectedName?: string | null;
}): Promise<InsuranceAiInspection | null> {
  if (!aiConfigured()) return null;
  const doc = await urlToDataUrl(args.documentUrl);
  if (!doc) return null;

  const expectText = args.expectedName
    ? `\n\nThe customer record says the named insured should be: ${args.expectedName}. Flag any mismatch with the printed document.`
    : "";

  const todayIso = new Date().toISOString().slice(0, 10);

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `You are inspecting a proof-of-insurance document for a luxury car rental company.${expectText}

Today's date: ${todayIso}.

Output JSON with this shape (no markdown, no extra text):
{
  "score": <integer 0-100>,
  "flags": [<zero or more codes from this list>: "expired", "expiring_soon", "name_mismatch", "insufficient_coverage", "liability_only", "not_an_insurance_doc", "vehicle_specific", "photo_quality_low", "photo_tampered", "international", "no_dates_visible"],
  "summary": "<1-2 sentence human-readable assessment for the operator>",
  "extracted": {
    "company": "<insurance company name as printed>",
    "policyNumber": "<policy number as printed>",
    "namedInsured": "<full name of the named insured>",
    "effectiveDate": "<YYYY-MM-DD>",
    "expirationDate": "<YYYY-MM-DD>"
  }
}

Scoring guidance (start at 100, subtract for issues):
- Expired: subtract 70+ (blocker)
- Not an insurance doc / tampered: subtract 70+ (blocker)
- Name mismatch: subtract 25
- Vehicle-specific policy (only covers one VIN): subtract 25
- Liability-only / insufficient coverage: subtract 15
- Expiring within 14 days: subtract 10
- Photo quality low: subtract 15
- International insurance: subtract 10
- A genuine, in-date personal auto policy with named insured matching the customer should score 90+.`,
    },
    { type: "image_url", image_url: { url: doc, detail: "high" } },
  ];

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: userContent }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<InsuranceAiInspection>;
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      flags: Array.isArray(parsed.flags)
        ? parsed.flags.filter((f): f is string => typeof f === "string")
        : [],
      summary: String(parsed.summary ?? "").trim() || "(no summary)",
      extracted: parsed.extracted,
    };
  } catch (e) {
    console.error("ai-insurance-check failed:", e);
    return null;
  }
}

export function aggregateInsuranceRisk(args: {
  aiScore: number | null;
  aiFlags: string[] | null;
  isExpired: boolean;
}): "low" | "medium" | "high" | "block" {
  const flags = args.aiFlags ?? [];

  if (
    args.isExpired ||
    flags.includes("not_an_insurance_doc") ||
    flags.includes("photo_tampered")
  ) {
    return "block";
  }

  if (
    (args.aiScore !== null && args.aiScore < 50) ||
    flags.includes("expired") ||
    flags.includes("name_mismatch")
  ) {
    return "high";
  }

  if (
    (args.aiScore !== null && args.aiScore < 75) ||
    flags.includes("expiring_soon") ||
    flags.includes("liability_only") ||
    flags.includes("insufficient_coverage") ||
    flags.includes("vehicle_specific") ||
    flags.includes("international") ||
    flags.includes("photo_quality_low")
  ) {
    return "medium";
  }

  return "low";
}
