import { getOpenAI } from "@/lib/ai";
import { getCompanyProfile } from "@/lib/data/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type {
  CallTranscriptEntry,
  Vehicle,
} from "@/lib/types/database";

/**
 * The brain behind the AI phone receptionist. Builds a context-aware system
 * prompt (company info + live fleet from Supabase), takes the conversation
 * history so far, asks gpt-4o-mini for the next reply, then parses any
 * action markers like [SEND_BOOKING_LINK] / [TRANSFER] / [END_CALL].
 */

export interface ReceptionistAction {
  sendBookingLink?: boolean;
  transfer?: boolean;
  endCall?: boolean;
}

export interface ReceptionistTurn {
  /** Plain text spoken to the caller (markers stripped). */
  spoken: string;
  /** Actions parsed out of the reply for the route handler to execute. */
  action: ReceptionistAction;
}

const HOURS_TEXT =
  "Mon–Fri 8:00 AM to 7:00 PM, Saturday 9:00 AM to 5:00 PM, closed Sunday";

/** Pull the public fleet so the AI can quote real cars and real prices. */
async function loadFleetContext(): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vehicles")
      .select("year, make, model, trim, category, daily_rate, status")
      .neq("status", "inactive")
      .order("daily_rate", { ascending: false });
    const rows = (data as Vehicle[] | null) ?? [];
    if (rows.length === 0) return "(No vehicles currently listed.)";
    return rows
      .map((v) => {
        const name = [v.year, v.make, v.model, v.trim]
          .filter(Boolean)
          .join(" ");
        const available =
          v.status === "available" ? "available" : `currently ${v.status}`;
        return `- ${name} (${v.category}) — ${formatCurrency(
          v.daily_rate,
        )}/day · ${available}`;
      })
      .join("\n");
  } catch {
    return "(Fleet temporarily unavailable.)";
  }
}

async function buildSystemPrompt(): Promise<string> {
  const company = await getCompanyProfile();
  const fleet = await loadFleetContext();

  return `You are the AI phone assistant for ${company.name}, a luxury and insurance-replacement car rental company in Van Nuys, California.

# Your role
You answer the phone, help callers with rental questions, send them a booking link via SMS, or transfer them to a real person if they'd prefer. You are friendly, brief, and helpful — like a great hotel concierge.

# How to speak
- Short sentences. Real-receptionist style.
- Don't lecture or read long lists. Answer the question, ask one thing back if needed.
- Confirm before doing anything (sending an SMS or transferring).
- If you don't know something, say so — don't make it up.
- If asked, openly say you're the ${company.name} AI assistant. Don't pretend to be human.

# Business details
Company: ${company.name}
Address: ${company.address}
Phone: ${company.phone}
Website: ${SITE_URL}
Email: ${company.email}
Hours: ${HOURS_TEXT}

# Current fleet (live from the system)
${fleet}

# What you can help with
- Pricing & availability questions
- Booking a rental (send a booking link via SMS so they can finish online)
- Insurance-replacement rentals (we bill the insurer directly — they should have a claim number ready)
- Hours, location, directions
- General questions about how renting works
- Transferring to a real person

# What you CANNOT do
- Take a payment over the phone
- Modify or cancel existing reservations (transfer to a person for those)
- Promise discounts that aren't in current offers

# Actions you can take (include the marker in your reply text — our system removes it before speaking)
- [SEND_BOOKING_LINK] — sends an SMS with the website to the caller's number. Use after the caller agrees they want to book online.
- [TRANSFER] — transfers the call to a real person at the owner's cell phone. Use if the caller specifically asks for a human, has a complaint, or wants to modify an existing reservation.
- [END_CALL] — ends the call gracefully. Use after a clear goodbye, never abruptly.

# Examples

Caller: "How much is the Mercedes?"
You: "We have the Mercedes-AMG GLE 53 Coupe at $349 a day, and the Mercedes-Benz S500 at $399 a day. Were you looking at a specific date range?"

Caller: "I want to book one."
You: "Awesome — easiest way is I text you a link to our booking page, you pick your dates, and you're done in about a minute. Want me to send that?"

Caller: "Yes please."
You: "Sending that now. [SEND_BOOKING_LINK] You should get the text in a few seconds. Anything else I can help with?"

Caller: "I'd rather just talk to someone."
You: "Of course — let me get you over to our team right now. [TRANSFER]"

Caller: "Thanks, that's all."
You: "Thanks for calling ${company.name}. Have a great day! [END_CALL]"

Remember: be brief, be warm, and use the action markers only when you actually mean to trigger them.`;
}

/**
 * Generate the next assistant turn given the conversation history so far.
 * `history` is in chronological order (oldest first).
 */
export async function generateReceptionistTurn(
  history: CallTranscriptEntry[],
): Promise<ReceptionistTurn> {
  const systemPrompt = await buildSystemPrompt();

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    temperature: 0.55,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
    ],
  });
  const raw = completion.choices[0]?.message?.content?.trim() ?? "";

  // Parse out action markers — strip them from spoken text.
  const action: ReceptionistAction = {};
  let spoken = raw;
  const markers: { re: RegExp; key: keyof ReceptionistAction }[] = [
    { re: /\[SEND_BOOKING_LINK\]/gi, key: "sendBookingLink" },
    { re: /\[TRANSFER\]/gi, key: "transfer" },
    { re: /\[END_CALL\]/gi, key: "endCall" },
  ];
  for (const { re, key } of markers) {
    if (re.test(spoken)) {
      action[key] = true;
      spoken = spoken.replace(re, " ").replace(/\s+/g, " ").trim();
    }
  }

  // Fallback if the model returned nothing meaningful.
  if (!spoken) {
    spoken =
      "I'm sorry, could you repeat that? I want to make sure I help you with the right thing.";
  }

  return { spoken, action };
}

/**
 * Generate a 2-3 sentence summary of a finished call plus an inferred intent.
 * Called once from the call-status webhook after the call ends.
 */
export async function summarizeCall(
  transcript: CallTranscriptEntry[],
): Promise<{ summary: string; intent: string; callerName: string | null }> {
  if (transcript.length === 0) {
    return { summary: "Call ended before any conversation.", intent: "no_answer", callerName: null };
  }
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Summarize a customer phone call to a car-rental business. Output JSON of the form { summary, intent, caller_name }. summary: 2-3 sentence plain-English summary for the owner. intent: one of pricing_question, booking, insurance_claim, support, modify_reservation, complaint, hours_or_location, transfer_to_human, no_answer, general. caller_name: the caller's first name if they said it, else null.",
        },
        {
          role: "user",
          content:
            "Transcript:\n" +
            transcript
              .map((m) => `${m.role === "user" ? "Caller" : "Assistant"}: ${m.content}`)
              .join("\n"),
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      summary?: string;
      intent?: string;
      caller_name?: string | null;
    };
    return {
      summary: String(parsed.summary ?? "").trim() || "(no summary)",
      intent: String(parsed.intent ?? "general").trim(),
      callerName: parsed.caller_name?.trim() || null,
    };
  } catch {
    return {
      summary: `${transcript.length}-turn conversation.`,
      intent: "general",
      callerName: null,
    };
  }
}
