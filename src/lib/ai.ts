import OpenAI from "openai";

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
