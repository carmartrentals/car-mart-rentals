import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiConfigured, runAssistant, type ChatMessage } from "@/lib/ai";
import { getPageContent } from "@/lib/website-content";
import { getCompanyProfile } from "@/lib/data/settings";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Website AI assistant — answers visitor questions grounded in the company's
 * fleet, FAQ and rental policies. Pay-per-use via OpenAI.
 */
export async function POST(request: Request) {
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "The assistant is not available right now." },
      { status: 503 },
    );
  }

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No message to answer." }, { status: 400 });
  }

  try {
    const context = await buildContext();
    const reply = await runAssistant(messages, context);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "The assistant could not respond. Please try again." },
      { status: 500 },
    );
  }
}

/** Assemble the grounding knowledge the assistant is allowed to use. */
async function buildContext(): Promise<string> {
  const company = await getCompanyProfile();
  const parts: string[] = [
    `COMPANY: ${company.name} — ${company.tagline}. ` +
      `Phone: ${company.phone}. Email: ${company.email}. ` +
      `Address: ${company.address}.`,
  ];

  try {
    const admin = createAdminClient();
    const { data: vehicles } = await admin
      .from("vehicles")
      .select(
        "year, make, model, category, daily_rate, seats, transmission, fuel_type, status",
      )
      .neq("status", "inactive")
      .order("daily_rate", { ascending: true })
      .limit(60);
    if (vehicles && vehicles.length) {
      parts.push("FLEET (vehicles available to rent):");
      for (const v of vehicles) {
        parts.push(
          `- ${v.year} ${v.make} ${v.model} (${v.category}): ` +
            `from ${formatCurrency(Number(v.daily_rate))} per day, ` +
            `${v.seats} seats, ${v.transmission}, ${v.fuel_type}.`,
        );
      }
    }
  } catch {
    /* fleet is optional context */
  }

  try {
    const faq = await getPageContent("faq");
    parts.push("FREQUENTLY ASKED QUESTIONS:");
    for (const s of faq.sections) {
      parts.push(`Q: ${s.title}\nA: ${s.body}`);
    }
  } catch {
    /* faq is optional */
  }

  try {
    const terms = await getPageContent("terms");
    parts.push("RENTAL POLICIES:");
    for (const s of terms.sections) {
      parts.push(`- ${s.title}: ${s.body}`);
    }
  } catch {
    /* terms are optional */
  }

  parts.push(
    "WEBSITE PAGES: Browse the fleet at /vehicles. Start a booking at " +
      "/booking. Contact the team at /contact. Current deals at /offers.",
  );
  return parts.join("\n");
}
