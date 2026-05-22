import OpenAI from "openai";
import type { DamageSeverity } from "@/lib/types/database";

/**
 * OpenAI client — SERVER ONLY.
 * Configure OPENAI_API_KEY in the environment to enable AI features.
 */
let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("AI is not configured. Add OPENAI_API_KEY to your environment.");
  }
  cached = new OpenAI({ apiKey: key });
  return cached;
}

/** True when an OpenAI key is present. */
export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Vision-capable model used for document reading — cheap and fast. */
const VISION_MODEL = "gpt-4o-mini";

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t : null;
};

/** Keep only well-formed YYYY-MM-DD dates. */
const cleanDate = (v: unknown): string | null => {
  const t = clean(v);
  return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
};

/** Like toDataUrl but returns null instead of throwing on a failed image. */
async function tryDataUrl(url: string): Promise<string | null> {
  try {
    return await toDataUrl(url);
  } catch {
    return null;
  }
}

/** Download a document and turn it into a base64 data URL for vision input. */
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the document image.");
  const type = res.headers.get("content-type") || "image/jpeg";
  if (type.includes("pdf")) {
    throw new Error(
      "Auto-fill works with photos. Please take a clear photo of the document, or type the details in.",
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buf.toString("base64")}`;
}

/** Ask the vision model to extract structured fields from a document image. */
async function extract(imageUrl: string, instruction: string) {
  const dataUrl = await toDataUrl(imageUrl);
  const completion = await getOpenAI().chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 350,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface InsuranceExtract {
  insurance_company: string | null;
  policy_number: string | null;
  expiration_date: string | null;
  named_insured: string | null;
}

/** Read a US auto-insurance card or declaration page. */
export async function extractInsurance(
  imageUrl: string,
): Promise<InsuranceExtract> {
  const data = await extract(
    imageUrl,
    "This image is a US auto insurance card or insurance declaration page. " +
      "Return ONLY a JSON object with these keys: " +
      "insurance_company (the insurer's name), " +
      "policy_number (the policy or account number), " +
      "expiration_date (the coverage end date, formatted strictly as YYYY-MM-DD), " +
      "named_insured (the primary policyholder's full name). " +
      "Use null for any field that is not clearly visible.",
  );
  return {
    insurance_company: clean(data.insurance_company),
    policy_number: clean(data.policy_number),
    expiration_date: cleanDate(data.expiration_date),
    named_insured: clean(data.named_insured),
  };
}

export interface LicenseExtract {
  license_number: string | null;
  state: string | null;
  expiration_date: string | null;
  date_of_birth: string | null;
  full_name: string | null;
}

/** Read the front of a US driver license. */
export async function extractLicense(
  imageUrl: string,
): Promise<LicenseExtract> {
  const data = await extract(
    imageUrl,
    "This image is the front of a US driver license. " +
      "Return ONLY a JSON object with these keys: " +
      "license_number (the driver license number, often labelled DL or LIC), " +
      "state (the two-letter US state code that issued it), " +
      "expiration_date (the expiry date, formatted strictly as YYYY-MM-DD), " +
      "date_of_birth (formatted strictly as YYYY-MM-DD), " +
      "full_name (the holder's full name). " +
      "Use null for any field that is not clearly visible.",
  );
  const state = clean(data.state);
  return {
    license_number: clean(data.license_number),
    state: state ? state.toUpperCase().slice(0, 2) : null,
    expiration_date: cleanDate(data.expiration_date),
    date_of_birth: cleanDate(data.date_of_birth),
    full_name: clean(data.full_name),
  };
}

export interface DamageFinding {
  location: string;
  description: string;
  severity: DamageSeverity;
}

const DAMAGE_INSTRUCTION =
  "You are a vehicle damage inspector for a car rental company. You will be " +
  "shown PICKUP photos (the car when it was rented out) followed by RETURN " +
  "photos (the same car now). Carefully compare them and identify NEW damage " +
  "visible in the RETURN photos that is not present in the PICKUP photos — " +
  "dents, scratches, scrapes, cracked or chipped glass, missing parts, flat " +
  "or damaged tires, and notable new stains. Return ONLY a JSON object of the " +
  'form {"damage":[{"location":"short area name e.g. front bumper",' +
  '"description":"what the damage is","severity":"minor|moderate|major"}]}. ' +
  "Ignore damage that appears in BOTH the pickup and return photos — that is " +
  'pre-existing. If you cannot clearly see any new damage, return {"damage":[]}. ' +
  "Be conservative: only report damage you can clearly see.";

/** Compare check-out vs check-in photos and flag suspected new damage. */
export async function detectVehicleDamage(
  checkoutUrls: string[],
  checkinUrls: string[],
): Promise<DamageFinding[]> {
  const before = checkoutUrls.slice(0, 6);
  const after = checkinUrls.slice(0, 8);
  if (after.length === 0) {
    throw new Error("Add the return photos first, then run the scan.");
  }

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: DAMAGE_INSTRUCTION },
  ];

  const beforeImgs = (await Promise.all(before.map(tryDataUrl))).filter(
    (u): u is string => Boolean(u),
  );
  const afterImgs = (await Promise.all(after.map(tryDataUrl))).filter(
    (u): u is string => Boolean(u),
  );
  if (afterImgs.length === 0) {
    throw new Error("Could not load the return photos. Please try again.");
  }

  if (beforeImgs.length) {
    content.push({
      type: "text",
      text: `PICKUP photos (${beforeImgs.length}):`,
    });
    for (const url of beforeImgs) {
      content.push({ type: "image_url", image_url: { url } });
    }
  } else {
    content.push({
      type: "text",
      text: "No pickup photos are available — report any damage visible in the return photos.",
    });
  }
  content.push({ type: "text", text: `RETURN photos (${afterImgs.length}):` });
  for (const url of afterImgs) {
    content.push({ type: "image_url", image_url: { url } });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content }],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { damage?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed.damage) ? parsed.damage : [];
  const sev = (v: unknown): DamageSeverity => {
    const t = String(v).toLowerCase();
    return t === "major" ? "major" : t === "moderate" ? "moderate" : "minor";
  };
  return list
    .map((d) => {
      const row = (d ?? {}) as Record<string, unknown>;
      return {
        location: clean(row.location) ?? "",
        description: clean(row.description) ?? "",
        severity: sev(row.severity),
      };
    })
    .filter((d) => d.location || d.description);
}

// --- Website assistant (chat) ----------------------------------------------
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ASSISTANT_SYSTEM =
  "You are a friendly, professional virtual assistant for a car rental " +
  "company, embedded as a chat widget on their website. Your job is to help " +
  "visitors with questions about renting a vehicle and gently encourage them " +
  "to book.\n\n" +
  "Rules:\n" +
  "- Use ONLY the BUSINESS INFORMATION provided below. Never invent prices, " +
  "policies, vehicles, discounts or availability.\n" +
  "- If something is not covered, say you are not sure and suggest contacting " +
  "the team or using the booking page.\n" +
  "- Keep answers short, warm and easy to read — usually 1-3 short sentences " +
  "or a very short list.\n" +
  "- When relevant, encourage the visitor to browse the fleet or book online.\n" +
  "- Only discuss this company and car rental. Politely decline other topics.\n" +
  "- You cannot make bookings, check live availability, or access accounts — " +
  "direct those requests to the booking page or the team.";

/** Answer a website visitor's chat message using the business knowledge. */
export async function runAssistant(
  messages: ChatMessage[],
  context: string,
): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 450,
    messages: [
      {
        role: "system",
        content: `${ASSISTANT_SYSTEM}\n\n=== BUSINESS INFORMATION ===\n${context}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  return (
    completion.choices[0]?.message?.content?.trim() ||
    "Sorry, I'm not able to answer that right now — please contact our team."
  );
}
