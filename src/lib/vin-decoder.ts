import { getOpenAI, aiConfigured } from "@/lib/ai";
import type {
  VehicleCategory,
  FuelType,
  TransmissionType,
} from "@/lib/types/database";

/**
 * Decode a 17-character VIN into a vehicle spec via NHTSA's free public API,
 * then ask the OpenAI model to generate the typical feature list for that
 * specific year/make/model/trim. NHTSA gives us the verified hard facts;
 * the LLM fills in the soft inventory (panoramic roof, heated seats, etc.).
 */

export interface VinDecodeResult {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  category: VehicleCategory | null;
  fuelType: FuelType | null;
  transmission: TransmissionType | null;
  doors: number | null;
  seats: number | null;
  engine: string | null;
  features: string[];
}

const NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

// Detect luxury vehicles by make so we override the body-class-based
// category. e.g. a BMW sedan should still land in the "luxury" tier.
const LUXURY_MAKES = new Set(
  [
    "mercedes-benz",
    "bmw",
    "audi",
    "lexus",
    "porsche",
    "bentley",
    "rolls-royce",
    "maserati",
    "cadillac",
    "lincoln",
    "acura",
    "infiniti",
    "jaguar",
    "land rover",
    "range rover",
    "genesis",
    "alfa romeo",
    "aston martin",
    "ferrari",
    "lamborghini",
    "mclaren",
  ].map((s) => s.toLowerCase()),
);

function toCategory(
  bodyClass: string | null,
  make: string | null,
  fuelType: FuelType | null,
): VehicleCategory | null {
  if (make && LUXURY_MAKES.has(make.toLowerCase())) return "luxury";
  if (!bodyClass) return null;
  const b = bodyClass.toLowerCase();
  if (b.includes("suv") || b.includes("sport utility") || b.includes("van"))
    return "suv";
  if (b.includes("coupe") || b.includes("convertible") || b.includes("roadster"))
    return "sports";
  if (b.includes("pickup") || b.includes("truck")) return "suv";
  if (fuelType === "electric") return "electric";
  if (b.includes("sedan") || b.includes("saloon")) return "sedan";
  if (b.includes("hatchback") || b.includes("wagon")) return "economy";
  return "sedan";
}

function toFuelType(raw: string | null): FuelType | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("electric") && !v.includes("hybrid")) return "electric";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("diesel")) return "diesel";
  if (v.includes("gasoline") || v.includes("petrol")) return "gasoline";
  return null;
}

function toTransmission(raw: string | null): TransmissionType | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("manual")) return "manual";
  // CVTs, DCTs, traditional autos — all "automatic" for our purposes.
  return "automatic";
}

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface NhtsaRow {
  ErrorCode?: string;
  ErrorText?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Trim?: string;
  Series?: string;
  BodyClass?: string;
  FuelTypePrimary?: string;
  TransmissionStyle?: string;
  DriveType?: string;
  EngineCylinders?: string;
  EngineHP?: string;
  DisplacementL?: string;
  Doors?: string;
  // NHTSA returns "Number of Seat Rows" but not always seats — best-effort.
}

/** Ask the LLM for the typical feature list for a year/make/model/trim. */
async function generateFeatures(input: {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
}): Promise<string[]> {
  if (!aiConfigured()) return [];
  if (!input.year || !input.make || !input.model) return [];

  const name = [input.year, input.make, input.model, input.trim]
    .filter(Boolean)
    .join(" ");

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write rental-listing feature lists for cars. Be specific and accurate to the exact trim. Use short, customer-facing labels customers see on Carvana or Edmunds.",
        },
        {
          role: "user",
          content: `List the typical standard features for a ${name} in JSON of the form {"features": ["...", "..."]}. Return 8-14 items. Examples of good items: "Panoramic Sunroof", "Heated Front Seats", "Apple CarPlay & Android Auto", "Adaptive Cruise Control", "Bluetooth", "Backup Camera", "Leather Interior", "Premium Audio". Do not include marketing fluff. Do not mention "rental" or this company. If the trim is unknown or generic, return features common to the base trim.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed.features) ? parsed.features : [];
    return list
      .filter((s: unknown): s is string => typeof s === "string")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && s.length < 80)
      .slice(0, 14);
  } catch {
    return [];
  }
}

/** Public entry point — decode a VIN and (optionally) enrich with features. */
export async function decodeVin(vinRaw: string): Promise<VinDecodeResult> {
  const vin = vinRaw.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    throw new Error("Enter a valid 17-character VIN (no I, O or Q).");
  }

  const res = await fetch(`${NHTSA_URL}/${encodeURIComponent(vin)}?format=json`);
  if (!res.ok) {
    throw new Error("Could not reach the VIN decoder. Please try again.");
  }
  const json = (await res.json()) as { Results?: NhtsaRow[] };
  const row = json.Results?.[0];
  if (!row || row.ErrorCode === "1") {
    throw new Error(
      `That VIN couldn't be decoded${row?.ErrorText ? `: ${row.ErrorText}` : "."}`,
    );
  }

  const year = toInt(row.ModelYear ?? null);
  const make = row.Make?.trim() || null;
  const model = row.Model?.trim() || null;
  const trim = (row.Trim || row.Series)?.trim() || null;
  const bodyClass = row.BodyClass?.trim() || null;
  const fuelType = toFuelType(row.FuelTypePrimary ?? null);
  const transmission = toTransmission(row.TransmissionStyle ?? null);
  const doors = toInt(row.Doors ?? null);
  const cyl = row.EngineCylinders;
  const disp = row.DisplacementL;
  const hp = row.EngineHP;
  const engine =
    [
      disp ? `${parseFloat(disp).toFixed(1)}L` : null,
      cyl ? `${cyl}-cyl` : null,
      hp ? `${hp} hp` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;

  if (!make && !model) {
    throw new Error(
      "That VIN didn't match a known vehicle. Double-check the characters and try again.",
    );
  }

  const features = await generateFeatures({ year, make, model, trim });
  const category = toCategory(bodyClass, make, fuelType);

  return {
    vin,
    year,
    make,
    model,
    trim,
    bodyClass,
    category,
    fuelType,
    transmission,
    doors,
    seats: null, // NHTSA doesn't reliably return seat count
    engine,
    features,
  };
}
