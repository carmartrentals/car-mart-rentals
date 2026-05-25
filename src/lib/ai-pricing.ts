import { getOpenAI, aiConfigured } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VehicleStats, DemandOutlook } from "@/lib/data/pricing-insights";

/**
 * AI pricing analyst — takes the deterministic stats from
 * lib/data/pricing-insights.ts and asks gpt-4o-mini to:
 *   1. Suggest new daily / weekend / weekly / monthly rates per vehicle
 *   2. Write a 3-4 sentence executive brief for the owner
 *
 * Results are cached for 12 hours in the settings table so the page
 * doesn't burn a fresh OpenAI call on every refresh.
 */

export interface PricingSuggestion {
  vehicleId: string;
  /** Confidence the AI has in this suggestion: high | medium | low */
  confidence: "high" | "medium" | "low";
  /** Direction relative to current rate: up | down | hold */
  direction: "up" | "down" | "hold";
  /** Suggested new rates. Null = no change suggested for that bucket. */
  dailyRate: number | null;
  weekendRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  rationale: string;
}

export interface PricingBrief {
  /** 3-4 sentence summary for the owner. */
  summary: string;
  /** Per-vehicle suggestions. */
  suggestions: PricingSuggestion[];
  /** When this brief was generated (ISO timestamp). */
  generatedAt: string;
}

const CACHE_KEY = "pricing_brief_cache";
const CACHE_TTL_HOURS = 12;

/** Pull cached brief if it's still fresh; otherwise null. */
async function loadCached(): Promise<PricingBrief | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", CACHE_KEY)
      .maybeSingle();
    const cached = (data?.value as PricingBrief | undefined) ?? null;
    if (!cached?.generatedAt) return null;
    const ageHours =
      (Date.now() - new Date(cached.generatedAt).getTime()) / 3_600_000;
    if (ageHours > CACHE_TTL_HOURS) return null;
    return cached;
  } catch {
    return null;
  }
}

async function saveCached(brief: PricingBrief): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("settings")
      .upsert({ key: CACHE_KEY, value: brief }, { onConflict: "key" });
  } catch {
    /* cache is best-effort */
  }
}

/** Clear the cache — used when the operator wants a fresh analysis. */
export async function clearPricingCache(): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("settings").delete().eq("key", CACHE_KEY);
  } catch {
    /* ignore */
  }
}

interface AiVehicleInput {
  id: string;
  name: string;
  category: string;
  currentRates: {
    daily: number;
    weekend: number | null;
    weekly: number | null;
    monthly: number | null;
  };
  past90: {
    utilization: number;
    revenue: number;
    daysBooked: number;
    averageDailyRateAchieved: number;
  };
  upcoming: {
    utilization: number;
    daysBooked: number;
  };
  daysUntilFree: number | null;
}

function trimForPrompt(stats: VehicleStats[]): AiVehicleInput[] {
  return stats.map((s) => ({
    id: s.vehicle.id,
    name: `${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}${
      s.vehicle.trim ? " " + s.vehicle.trim : ""
    }`,
    category: s.vehicle.category,
    currentRates: {
      daily: Number(s.vehicle.daily_rate),
      weekend: s.vehicle.weekend_rate ?? null,
      weekly: s.vehicle.weekly_rate ?? null,
      monthly: s.vehicle.monthly_rate ?? null,
    },
    past90: s.past90,
    upcoming: s.upcoming,
    daysUntilFree: s.daysUntilFree,
  }));
}

/**
 * Generate a pricing brief. Returns the cached version when fresh, otherwise
 * calls OpenAI and caches the result for 12 hours.
 */
export async function generatePricingBrief(
  stats: VehicleStats[],
  outlook: DemandOutlook[],
  force = false,
): Promise<PricingBrief | null> {
  if (!aiConfigured()) return null;

  if (!force) {
    const cached = await loadCached();
    if (cached) return cached;
  }

  const vehicleInput = trimForPrompt(stats);
  const totalUpcomingDays = outlook.reduce(
    (s, d) => s + d.vehiclesBooked,
    0,
  );
  const totalAvailableDays = outlook.reduce(
    (s, d) => s + d.vehiclesTotal,
    0,
  );
  const upcomingFillRate =
    totalAvailableDays > 0
      ? Math.round((totalUpcomingDays / totalAvailableDays) * 100)
      : 0;

  const system = `You are a pricing analyst for a small luxury car rental company in Van Nuys, CA. You have 90 days of historical bookings and 30 days of forward bookings per vehicle. Your job is to recommend daily, weekend, weekly and monthly rate changes per vehicle, plus write a brief executive summary.

# Pricing heuristics
- High utilization (past 90 days > 80%) → raise rates 10-25%. Demand exceeds supply.
- Strong utilization (60-80%) → raise rates 5-10%. Room to push.
- Healthy (40-60%) → hold or small +/- 3%.
- Weak (20-40%) → drop daily 5-10% to fill seats; consider better weekly/monthly discount to encourage longer rentals.
- Very weak (<20%) → drop 15-25% or promote actively.
- If upcoming 30-day bookings are already strong (>60%), be MORE aggressive raising rates than the 90-day suggests.
- If upcoming is weak (<20%), be MORE aggressive lowering than the 90-day suggests.
- Weekend rates: should be 10-25% above daily for luxury/sports; 0-10% above for economy/sedan.
- Weekly rate: should equal about 6 days of daily rate (i.e. 1 day free for a 7-day rental).
- Monthly rate: should equal about 22 days of daily rate.
- Luxury/sports cars can support higher percentages; economy is more price-sensitive.
- Round all rates to whole dollars (no cents).

# Output JSON structure (no markdown, no extra text):
{
  "summary": "3-4 sentence executive summary for the owner. Tone: direct, practical, actionable. Cite specific numbers.",
  "suggestions": [
    {
      "vehicleId": "uuid",
      "confidence": "high" | "medium" | "low",
      "direction": "up" | "down" | "hold",
      "dailyRate": <new number, or null if no change>,
      "weekendRate": <new number, or null>,
      "weeklyRate": <new number, or null>,
      "monthlyRate": <new number, or null>,
      "rationale": "1-2 sentence explanation citing the utilization or demand signal"
    }
  ]
}

Include a suggestion entry for EVERY vehicle in the input, even if direction is "hold" (then all rates null).`;

  const user = `Fleet snapshot:

UPCOMING 30-DAY FLEET FILL RATE: ${upcomingFillRate}% (${totalUpcomingDays} car-days booked of ${totalAvailableDays} possible)

VEHICLES (with past-90-day and next-30-day stats):
${JSON.stringify(vehicleInput, null, 2)}

Generate the JSON.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<PricingBrief>;
    const brief: PricingBrief = {
      summary: String(parsed.summary ?? "").trim() || "(No summary)",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((s) => ({
            vehicleId: String(s.vehicleId),
            confidence:
              s.confidence === "high" || s.confidence === "low"
                ? s.confidence
                : "medium",
            direction:
              s.direction === "up" || s.direction === "down"
                ? s.direction
                : "hold",
            dailyRate:
              typeof s.dailyRate === "number" ? Math.round(s.dailyRate) : null,
            weekendRate:
              typeof s.weekendRate === "number"
                ? Math.round(s.weekendRate)
                : null,
            weeklyRate:
              typeof s.weeklyRate === "number" ? Math.round(s.weeklyRate) : null,
            monthlyRate:
              typeof s.monthlyRate === "number"
                ? Math.round(s.monthlyRate)
                : null,
            rationale: String(s.rationale ?? "").trim() || "",
          }))
        : [],
      generatedAt: new Date().toISOString(),
    };
    await saveCached(brief);
    return brief;
  } catch (e) {
    console.error("ai-pricing: generate failed", e);
    return null;
  }
}
