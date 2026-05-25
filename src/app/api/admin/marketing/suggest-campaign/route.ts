import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { getOpenAI, aiConfigured } from "@/lib/ai";
import { getCompanyProfile } from "@/lib/data/settings";
import { findHoliday } from "@/lib/holidays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI-generate a full marketing campaign for a given holiday. Returns
 * name, subject, preheader, body, and a suggested promo code string —
 * the operator can edit anything before sending. Admin-only.
 */

interface Suggestion {
  name: string;
  subject: string;
  preheader: string;
  body: string;
  suggested_promo_code: string;
  suggested_discount_percent: number;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set on the server." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    holiday_slug?: string;
    custom_angle?: string;
  };

  if (!body.holiday_slug) {
    return NextResponse.json(
      { error: "holiday_slug is required" },
      { status: 400 },
    );
  }

  const holiday = findHoliday(body.holiday_slug);
  if (!holiday) {
    return NextResponse.json(
      { error: "Unknown or past holiday" },
      { status: 400 },
    );
  }

  const company = await getCompanyProfile();
  const friendlyDate = holiday.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const daysUntil = Math.ceil(
    (holiday.date.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );

  const systemPrompt = `You are a marketing copywriter for a premium / luxury car rental company. You write short, warm, premium-feeling emails that drive bookings without being pushy.

# How to write
- Conversational, real-person voice — no "Dear valued customer"
- Lead with the holiday/occasion, not the discount
- One clear call-to-action
- Body should be 2-4 short paragraphs (40-90 words total)
- Use blank lines between paragraphs (we render them with proper spacing)
- Subject line under 50 chars when possible, never over 70
- Preheader complements the subject (don't repeat it) — about 60-90 chars
- NEVER use generic salutations like "Dear Customer" — the email already opens with "Hi {first_name}," so jump straight into the body
- Match the holiday's vibe (provided below)
- Mention the discount briefly in the body, but the dashed promo box in the email shows the code prominently — don't overdo it in copy

# Company
${company.name}
${company.address}

# What to write about
Holiday: ${holiday.name}
Date: ${friendlyDate} (${daysUntil} days from today)
Vibe / tone: ${holiday.vibe}
Angles to consider: ${holiday.angles.join(" · ")}
${body.custom_angle ? `Operator's added angle: ${body.custom_angle}` : ""}

# Output JSON — exactly this shape, nothing else
{
  "name": "Internal campaign name shown only to the operator. Format: 'Holiday Year' — e.g. 'Memorial Day 2026'",
  "subject": "The email subject line — what customers see in their inbox",
  "preheader": "Inbox preview snippet that complements the subject",
  "body": "The email body. Plain text, 2-4 short paragraphs, blank lines between paragraphs. Do NOT start with 'Hi' or any greeting — the email template adds that automatically.",
  "suggested_promo_code": "An uppercase code like ${holiday.promoPrefix}<n> the operator could create. Make it short and memorable.",
  "suggested_discount_percent": 15
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 700,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a marketing email for ${holiday.name}.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<Suggestion>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed JSON. Try again." },
        { status: 500 },
      );
    }

    const result: Suggestion = {
      name: String(parsed.name ?? `${holiday.name} ${new Date().getUTCFullYear()}`).slice(0, 120),
      subject: String(parsed.subject ?? "").slice(0, 200),
      preheader: String(parsed.preheader ?? "").slice(0, 200),
      body: String(parsed.body ?? "").slice(0, 3000),
      suggested_promo_code: String(parsed.suggested_promo_code ?? "")
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 24),
      suggested_discount_percent: Math.min(
        50,
        Math.max(5, Number(parsed.suggested_discount_percent) || 15),
      ),
    };

    if (!result.subject || !result.body) {
      return NextResponse.json(
        { error: "AI returned an empty subject or body. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("suggest-campaign failed", err);
    return NextResponse.json(
      { error: "Could not generate the campaign. Try again." },
      { status: 500 },
    );
  }
}
