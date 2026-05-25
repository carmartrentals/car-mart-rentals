import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeSecret } from "@/lib/bridge-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownerPhoneNumber, sendSms } from "@/lib/twilio";
import { notifyCustomer } from "@/lib/notifications";
import { SITE_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bridge calls this when OpenAI Realtime invokes one of our tools. We
 * execute the side effect (send email, send SMS, log transfer/end) and
 * return a short text "result" string that the bridge feeds back into the
 * OpenAI conversation so the AI can speak a confirmation to the caller.
 */
export async function POST(req: NextRequest) {
  if (!verifyBridgeSecret(req.headers.get("x-bridge-secret"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: {
    callSid?: string;
    name?: string;
    arguments?: Record<string, unknown>;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ result: "Invalid request." }, { status: 400 });
  }

  const callSid = body.callSid || "";
  const name = body.name || "";
  const args = body.arguments || {};

  const admin = createAdminClient();

  switch (name) {
    case "send_booking_email": {
      const email = String(args.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({
          result:
            "That email looks invalid. Apologize, ask the caller to repeat it letter-by-letter, and try again.",
        });
      }
      try {
        await notifyCustomer({
          type: "ai_receptionist_booking_link",
          to: email,
          subject: "Your Car Mart Rentals booking link",
          heading: "Ready to book your rental",
          intro:
            "Thanks for calling Car Mart Rentals! Here's the link to browse our fleet and complete your reservation in about a minute.",
          rows: [
            { label: "Pickup location", value: "Van Nuys, CA" },
            {
              label: "Need help",
              value: "Reply to this email or call us back any time.",
            },
          ],
          cta: { label: "Browse the Fleet", path: "/vehicles" },
        });
        if (callSid) {
          await admin
            .from("call_logs")
            .update({ email_sent: true, caller_email: email })
            .eq("call_sid", callSid);
        }
        return NextResponse.json({
          result: `Booking link emailed to ${email}. Confirm to the caller and offer further help.`,
        });
      } catch (err) {
        console.error("bridge tool send_booking_email failed", err);
        return NextResponse.json({
          result:
            "The email failed to send. Apologize briefly and offer to transfer the caller to a person.",
        });
      }
    }

    case "send_booking_sms": {
      const { data: row } = await admin
        .from("call_logs")
        .select("from_number")
        .eq("call_sid", callSid)
        .maybeSingle();
      const caller = row?.from_number as string | undefined;
      if (!caller) {
        return NextResponse.json({
          result:
            "Couldn't identify the caller's phone number. Offer to send an email instead.",
        });
      }
      try {
        await sendSms(
          caller,
          `Thanks for calling Car Mart Rentals! Here's the link to browse our fleet and book: ${SITE_URL}/vehicles — reply STOP to opt out.`,
        );
        await admin
          .from("call_logs")
          .update({ sms_sent: true })
          .eq("call_sid", callSid);
        return NextResponse.json({
          result:
            "Text sent. Remind the caller it may take a couple minutes and to call back if it doesn't arrive.",
        });
      } catch (err) {
        console.error("bridge tool send_booking_sms failed", err);
        return NextResponse.json({
          result:
            "The text failed. Apologize and offer to send an email instead.",
        });
      }
    }

    case "transfer_to_human": {
      const owner = ownerPhoneNumber();
      if (callSid) {
        await admin
          .from("call_logs")
          .update({ transferred: true })
          .eq("call_sid", callSid);
      }
      if (!owner) {
        return NextResponse.json({
          result:
            "No human is available to transfer to right now. Apologize and offer to email the booking link or schedule a callback.",
        });
      }
      return NextResponse.json({
        result:
          "Tell the caller you're connecting them now, then say goodbye briefly so the call can be transferred.",
        transferTo: owner,
      });
    }

    case "end_call": {
      return NextResponse.json({
        result: "Say a brief, warm goodbye. The call will end after you speak.",
        endCall: true,
      });
    }

    default:
      return NextResponse.json({
        result: `Unknown tool "${name}". Apologize briefly and continue helping the caller.`,
      });
  }
}
