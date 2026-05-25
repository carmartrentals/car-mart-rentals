import OpenAI from "openai";
import { getOpenAI, aiConfigured } from "@/lib/ai";

/**
 * AI driver-license inspector. Takes the front (and optionally back) DL
 * photo URLs the customer uploaded and asks gpt-4o-mini-vision to:
 *   1. Score authenticity 0-100 based on visible security features
 *   2. Cross-check the printed name/DOB/license # against what we have on file
 *   3. Surface any red flags (photo edited, expired, age-restricted, etc.)
 *
 * The output feeds into a combined risk score alongside DMV checks and
 * cross-reference validations.
 */

export interface LicenseAiInspection {
  score: number;         // 0-100, higher = more authentic
  flags: string[];       // machine codes: "expired", "name_mismatch", etc.
  summary: string;       // 1-2 sentence human-readable summary
  extracted?: {
    name?: string | null;
    licenseNumber?: string | null;
    state?: string | null;
    dateOfBirth?: string | null;
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

/** Pretty-format any single AI flag for the UI. */
export function describeFlag(code: string): string {
  const map: Record<string, string> = {
    expired: "License is expired",
    expiring_soon: "License expires within 30 days",
    name_mismatch: "Name on license does not match customer record",
    dob_mismatch: "Date of birth on license does not match customer record",
    under_21: "Driver is under 21 — young driver surcharge applies",
    under_18: "Driver is under 18 — cannot rent",
    photo_quality_low: "Photo is blurry or low resolution",
    photo_tampered: "Photo shows signs of digital editing",
    not_a_dl: "Image does not appear to be a driver license",
    international: "International license — verify reciprocity rules",
    duplicate_replacement: "Marked as duplicate/replacement license",
    motorcycle_only: "Motorcycle endorsement only — not for cars",
    restricted: "License has driving restrictions",
  };
  return map[code] || code.replace(/_/g, " ");
}

export async function inspectLicensePhotos(args: {
  frontUrl: string;
  backUrl?: string | null;
  expectedName?: string | null;
  expectedDob?: string | null;
  expectedLicenseNumber?: string | null;
  expectedState?: string | null;
}): Promise<LicenseAiInspection | null> {
  if (!aiConfigured()) return null;
  const front = await urlToDataUrl(args.frontUrl);
  if (!front) return null;
  const back = args.backUrl ? await urlToDataUrl(args.backUrl) : null;

  const expectations = [
    args.expectedName ? `name: ${args.expectedName}` : null,
    args.expectedDob ? `date of birth: ${args.expectedDob}` : null,
    args.expectedLicenseNumber
      ? `license number: ${args.expectedLicenseNumber}`
      : null,
    args.expectedState ? `state: ${args.expectedState}` : null,
  ].filter(Boolean);
  const expectText = expectations.length
    ? `\n\nThe customer record says:\n- ${expectations.join("\n- ")}\nFlag any mismatch with the printed license.`
    : "";

  const todayIso = new Date().toISOString().slice(0, 10);

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `You are inspecting a US driver license for a luxury car rental company.${expectText}

Today's date: ${todayIso}.

Output JSON with this shape (no markdown, no extra text):
{
  "score": <integer 0-100>,
  "flags": [<zero or more codes from this list>: "expired", "expiring_soon", "name_mismatch", "dob_mismatch", "under_21", "under_18", "photo_quality_low", "photo_tampered", "not_a_dl", "international", "duplicate_replacement", "motorcycle_only", "restricted"],
  "summary": "<1-2 sentence human-readable assessment>",
  "extracted": {
    "name": "<full name as printed>",
    "licenseNumber": "<number as printed>",
    "state": "<two-letter state code>",
    "dateOfBirth": "<YYYY-MM-DD>",
    "expirationDate": "<YYYY-MM-DD>"
  }
}

Scoring guidance:
- Start at 100 and subtract for issues.
- Expired or under_18: subtract 50+ (these are blockers).
- Tampered or not_a_dl: subtract 70+.
- Photo quality low: subtract 15.
- Name/DOB mismatch: subtract 25 each.
- International license: subtract 10 (not blocking but flag for manual review).
- A genuine, clear, current US driver license with no mismatches should score 90+.`,
    },
    { type: "image_url", image_url: { url: front, detail: "high" } },
  ];
  if (back) {
    userContent.push({ type: "image_url", image_url: { url: back, detail: "high" } });
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: userContent }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<LicenseAiInspection>;
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      flags: Array.isArray(parsed.flags)
        ? parsed.flags.filter((f): f is string => typeof f === "string")
        : [],
      summary: String(parsed.summary ?? "").trim() || "(no summary)",
      extracted: parsed.extracted,
    };
  } catch (e) {
    console.error("ai-license-check failed:", e);
    return null;
  }
}

/**
 * Combine an AI inspection result + DMV check status + age into a single
 * risk level used for go/no-go decisions at check-out.
 */
export function aggregateLicenseRisk(args: {
  aiScore: number | null;
  aiFlags: string[] | null;
  dmvStatus: string | null; // valid | suspended | revoked | expired | unknown | null
  isExpired: boolean;
}): "low" | "medium" | "high" | "block" {
  const flags = args.aiFlags ?? [];

  // Hard blockers
  if (
    args.isExpired ||
    args.dmvStatus === "suspended" ||
    args.dmvStatus === "revoked" ||
    args.dmvStatus === "expired" ||
    flags.includes("under_18") ||
    flags.includes("not_a_dl") ||
    flags.includes("photo_tampered")
  ) {
    return "block";
  }

  // Strong signals
  if (
    (args.aiScore !== null && args.aiScore < 50) ||
    flags.includes("expired") ||
    flags.includes("name_mismatch") ||
    flags.includes("dob_mismatch")
  ) {
    return "high";
  }

  // Medium
  if (
    (args.aiScore !== null && args.aiScore < 75) ||
    flags.includes("expiring_soon") ||
    flags.includes("under_21") ||
    flags.includes("international") ||
    flags.includes("photo_quality_low") ||
    args.dmvStatus === "unknown"
  ) {
    return "medium";
  }

  return "low";
}
