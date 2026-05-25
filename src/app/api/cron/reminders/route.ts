import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification, notifyCompany, notifyCustomer } from "@/lib/notifications";
import {
  getBirthdayCampaignSettings,
  birthdayLeadDays,
} from "@/lib/data/settings";
import { processDueRecurringCampaigns } from "@/app/admin/(panel)/marketing/actions";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { ReservationWithRelations } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayRange(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Daily reminder job — run on a schedule (see vercel.json).
 * Sends pickup/return reminders, overdue alerts and document nudges.
 * De-duplicated via the notifications table, so it is safe to re-run.
 */
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    if (
      request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const RES = "*, customer:customers(*), vehicle:vehicles(*)";
  const counts = {
    pickup: 0,
    return: 0,
    overdue: 0,
    document: 0,
    deposit: 0,
    deposit_expiring: 0,
    recovery: 0,
    birthday: 0,
    recurring: 0,
  };

  async function alreadySent(type: string, reservationId: string) {
    const { data } = await admin
      .from("notifications")
      .select("id")
      .eq("type", type)
      .eq("reservation_id", reservationId)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  }
  const name = (r: ReservationWithRelations) =>
    r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : "Customer";
  const vehicle = (r: ReservationWithRelations) =>
    r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}` : "your vehicle";

  try {
    // 1. Pickup reminders — confirmed, pickup tomorrow
    const tomorrow = dayRange(1);
    const { data: pickups } = await admin
      .from("reservations")
      .select(RES)
      .eq("status", "confirmed")
      .gte("pickup_at", tomorrow.start)
      .lte("pickup_at", tomorrow.end);
    for (const r of (pickups as unknown as ReservationWithRelations[]) ?? []) {
      if (!r.customer?.email || (await alreadySent("pickup_reminder", r.id))) continue;
      await sendNotification({
        type: "pickup_reminder",
        templateKey: "pickup_reminder",
        to: r.customer.email,
        variables: {
          customer_name: name(r),
          vehicle_name: vehicle(r),
          reservation_number: r.reservation_number,
          pickup_at: formatDateTime(r.pickup_at),
        },
        imageUrl: r.vehicle?.main_image_url,
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.pickup++;
    }

    // 2. Return reminders — active, return today
    const today = dayRange(0);
    const { data: returns } = await admin
      .from("reservations")
      .select(RES)
      .eq("status", "active")
      .gte("return_at", today.start)
      .lte("return_at", today.end);
    for (const r of (returns as unknown as ReservationWithRelations[]) ?? []) {
      if (!r.customer?.email || (await alreadySent("return_reminder", r.id))) continue;
      await sendNotification({
        type: "return_reminder",
        templateKey: "return_reminder",
        to: r.customer.email,
        variables: {
          customer_name: name(r),
          vehicle_name: vehicle(r),
          reservation_number: r.reservation_number,
          return_at: formatDateTime(r.return_at),
        },
        imageUrl: r.vehicle?.main_image_url,
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.return++;
    }

    // 3. Overdue — active past return → mark overdue + alert
    const { data: overdue } = await admin
      .from("reservations")
      .select(RES)
      .eq("status", "active")
      .lt("return_at", new Date().toISOString());
    for (const r of (overdue as unknown as ReservationWithRelations[]) ?? []) {
      await admin.from("reservations").update({ status: "overdue" }).eq("id", r.id);

      // Customer overdue alert (de-duplicated).
      if (r.customer?.email && !(await alreadySent("overdue_alert", r.id))) {
        await sendNotification({
          type: "overdue_alert",
          templateKey: "overdue_alert",
          to: r.customer.email,
          variables: {
            customer_name: name(r),
            vehicle_name: vehicle(r),
            reservation_number: r.reservation_number,
            return_at: formatDateTime(r.return_at),
          },
          imageUrl: r.vehicle?.main_image_url,
          reservationId: r.id,
          customerId: r.customer_id,
        });
        counts.overdue++;
      }

      // Company overdue alert (de-duplicated, separate type).
      if (!(await alreadySent("overdue_company_alert", r.id))) {
        await notifyCompany({
          type: "overdue_company_alert",
          subject: `🔴 Overdue rental — ${r.reservation_number}`,
          heading: "Overdue Rental",
          intro: `${name(r)} has not yet returned ${vehicle(r)}. This rental is now overdue and needs follow-up.`,
          rows: [
            { label: "Reservation", value: r.reservation_number },
            { label: "Customer", value: name(r) },
            { label: "Vehicle", value: vehicle(r) },
            { label: "Was due back", value: formatDateTime(r.return_at) },
            ...(r.customer?.phone
              ? [{ label: "Customer phone", value: r.customer.phone }]
              : []),
          ],
          cta: {
            label: "Open in Admin Panel",
            path: `/admin/reservations/${r.id}`,
          },
          imageUrl: r.vehicle?.main_image_url,
          reservationId: r.id,
          customerId: r.customer_id,
        });
      }
    }

    // 4. Document reminders — confirmed pickups within 3 days, docs unverified
    const in3 = dayRange(3);
    const { data: docPending } = await admin
      .from("reservations")
      .select(RES)
      .eq("status", "confirmed")
      .gte("pickup_at", today.start)
      .lte("pickup_at", in3.end);
    for (const r of (docPending as unknown as ReservationWithRelations[]) ?? []) {
      const c = r.customer;
      const docsComplete =
        c?.dl_status === "verified" &&
        (!r.insurance_required || c?.insurance_status === "verified");
      if (
        !c?.email ||
        docsComplete ||
        (await alreadySent("document_reminder", r.id))
      )
        continue;
      await sendNotification({
        type: "document_reminder",
        templateKey: "document_reminder",
        to: c.email,
        variables: {
          customer_name: name(r),
          reservation_number: r.reservation_number,
        },
        imageUrl: r.vehicle?.main_image_url,
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.document++;
    }

    // 5. Deposit reminders — confirmed pickups within 3 days, a deposit is
    //    required but no hold has been authorized yet.
    const { data: authRows } = await admin
      .from("deposits")
      .select("reservation_id")
      .eq("status", "authorized");
    const authorizedResIds = new Set(
      (authRows ?? []).map((d) => d.reservation_id as string),
    );
    for (const r of (docPending as unknown as ReservationWithRelations[]) ?? []) {
      const c = r.customer;
      if (
        !c?.email ||
        Number(r.deposit_amount ?? 0) <= 0 ||
        authorizedResIds.has(r.id) ||
        (await alreadySent("deposit_reminder", r.id))
      )
        continue;
      await notifyCustomer({
        type: "deposit_reminder",
        to: c.email,
        subject: `🔒 Authorize your security deposit — ${r.reservation_number}`,
        heading: "Authorize Your Security Deposit",
        intro: `Hi ${name(r)}, your pickup of ${vehicle(r)} is coming up. Please authorize the refundable security deposit online for a quick, easy pickup. This places a hold on your card — it is not a charge.`,
        rows: [
          { label: "Reservation", value: r.reservation_number },
          { label: "Pickup", value: formatDateTime(r.pickup_at) },
          {
            label: "Deposit hold",
            value: formatCurrency(Number(r.deposit_amount ?? 0)),
          },
        ],
        cta: {
          label: "Authorize Deposit",
          path: `/account/reservations/${r.id}`,
        },
        imageUrl: r.vehicle?.main_image_url,
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.deposit++;
    }

    // 6. Deposit hold expiring — Stripe authorization holds last about 7 days.
    //    Warn the company once a hold is 5+ days old so they can re-authorize.
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const { data: oldHolds } = await admin
      .from("deposits")
      .select(
        "id, amount, authorized_at, reservation:reservations(id, reservation_number, status, customer:customers(first_name,last_name), vehicle:vehicles(year,make,model,main_image_url))",
      )
      .eq("status", "authorized")
      .lte("authorized_at", fiveDaysAgo);
    type DepositHoldRow = {
      id: string;
      amount: number;
      authorized_at: string;
      reservation: {
        id: string;
        reservation_number: string;
        status: string;
        customer: { first_name: string; last_name: string } | null;
        vehicle: {
          year: number;
          make: string;
          model: string;
          main_image_url: string | null;
        } | null;
      } | null;
    };
    for (const d of (oldHolds as unknown as DepositHoldRow[]) ?? []) {
      const resv = d.reservation;
      if (!resv || ["completed", "cancelled"].includes(resv.status)) continue;
      // De-dup per hold: skip if already alerted after this authorization.
      const { data: prior } = await admin
        .from("notifications")
        .select("id")
        .eq("type", "deposit_expiring_alert")
        .eq("reservation_id", resv.id)
        .gte("created_at", d.authorized_at)
        .limit(1)
        .maybeSingle();
      if (prior) continue;
      const custName = resv.customer
        ? `${resv.customer.first_name} ${resv.customer.last_name}`
        : "the customer";
      const vehName = resv.vehicle
        ? `${resv.vehicle.year} ${resv.vehicle.make} ${resv.vehicle.model}`
        : "the vehicle";
      await notifyCompany({
        type: "deposit_expiring_alert",
        subject: `⏳ Deposit hold expiring soon — ${resv.reservation_number}`,
        heading: "Security Deposit Hold Expiring",
        intro: `The security deposit hold for ${resv.reservation_number} was authorized on ${formatDateTime(d.authorized_at)}. Stripe holds expire about 7 days after authorization — re-authorize it (or capture what you need) before it lapses.`,
        rows: [
          { label: "Reservation", value: resv.reservation_number },
          { label: "Customer", value: custName },
          { label: "Vehicle", value: vehName },
          {
            label: "Hold amount",
            value: formatCurrency(Number(d.amount ?? 0)),
          },
          { label: "Authorized on", value: formatDateTime(d.authorized_at) },
        ],
        cta: {
          label: "Open in Admin Panel",
          path: `/admin/reservations/${resv.id}`,
        },
        imageUrl: resv.vehicle?.main_image_url,
        reservationId: resv.id,
      });
      counts.deposit_expiring++;
    }

    // 7. Abandoned-booking recovery — email customers who started a booking
    //    but never completed it.
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: drafts } = await admin
      .from("booking_drafts")
      .select(
        "id, email, first_name, pickup_at, return_at, vehicle:vehicles(slug, year, make, model, main_image_url)",
      )
      .eq("status", "open")
      .lte("created_at", twoHoursAgo)
      .gte("created_at", sevenDaysAgo);
    type DraftRow = {
      id: string;
      email: string;
      first_name: string | null;
      pickup_at: string | null;
      return_at: string | null;
      vehicle: {
        slug: string;
        year: number;
        make: string;
        model: string;
        main_image_url: string | null;
      } | null;
    };
    for (const d of (drafts as unknown as DraftRow[]) ?? []) {
      if (!d.email) continue;
      const veh = d.vehicle;
      const vehName = veh
        ? `${veh.year} ${veh.make} ${veh.model}`
        : "your selected vehicle";
      let path = "/vehicles";
      if (veh?.slug && d.pickup_at && d.return_at) {
        path =
          `/booking?vehicle=${veh.slug}` +
          `&pickup=${encodeURIComponent(d.pickup_at)}` +
          `&return=${encodeURIComponent(d.return_at)}`;
      } else if (veh?.slug) {
        path = `/vehicles/${veh.slug}`;
      }
      await notifyCustomer({
        type: "abandoned_booking_recovery",
        to: d.email,
        subject: `Still interested in the ${vehName}?`,
        heading: "Your Booking Is Waiting",
        intro: `Hi${d.first_name ? " " + d.first_name : ""}, you started a booking for the ${vehName} but didn't finish. It's still available — pick up right where you left off; it only takes a couple of minutes.`,
        rows: [
          { label: "Vehicle", value: vehName },
          ...(d.pickup_at
            ? [{ label: "Pickup", value: formatDateTime(d.pickup_at) }]
            : []),
        ],
        cta: { label: "Complete My Booking", path },
        imageUrl: veh?.main_image_url,
      });
      await admin
        .from("booking_drafts")
        .update({ status: "recovered" })
        .eq("id", d.id);
      counts.recovery++;
    }

    // 8. Birthday greetings — send each customer a discount email some
    //    configurable lead time before their birthday, once per year.
    //    Lead time, discount %, promo code, subject and intro are all
    //    editable from /admin/settings -> Birthday Campaign.
    try {
      const bday = await getBirthdayCampaignSettings();
      if (bday.enabled) {
        const leadDays = birthdayLeadDays(bday);
        const targetUtc = new Date();
        targetUtc.setUTCDate(targetUtc.getUTCDate() + leadDays);
        const tMonth = targetUtc.getUTCMonth() + 1; // 1-12
        const tDay = targetUtc.getUTCDate();
        const currentYear = new Date().getUTCFullYear();

        const { data: bdayCandidates } = await admin
          .from("customers")
          .select(
            "id, first_name, email, date_of_birth, last_birthday_email_year, marketing_opted_out, is_blacklisted",
          )
          .not("email", "is", null)
          .not("date_of_birth", "is", null)
          .eq("marketing_opted_out", false)
          .eq("is_blacklisted", false);

        type BdayRow = {
          id: string;
          first_name: string;
          email: string;
          date_of_birth: string;
          last_birthday_email_year: number | null;
        };
        const matches = ((bdayCandidates ?? []) as BdayRow[]).filter((c) => {
          if (!c.date_of_birth) return false;
          if (c.last_birthday_email_year === currentYear) return false;
          const dob = new Date(c.date_of_birth + "T00:00:00Z");
          return (
            dob.getUTCMonth() + 1 === tMonth && dob.getUTCDate() === tDay
          );
        });

        // Per-recipient token replacement for {{first_name}} and
        // {{discount_percent}} in the configured subject + intro.
        const fill = (s: string, firstName: string): string =>
          s
            .replace(/\{\{\s*first_name\s*\}\}/gi, firstName || "friend")
            .replace(
              /\{\{\s*discount_percent\s*\}\}/gi,
              String(bday.discount_percent),
            );

        // Per-customer unique-code generator. Generates a short random
        // alphanumeric suffix so the full code is e.g. "BDAY-X7K9P3M2".
        // 8 chars from a 32-character alphabet = ~10^12 possible codes,
        // way more than we'd ever mint in a year — no collisions in
        // practice. The unique constraint on promo_codes.code is the
        // belt-and-suspenders if one slips through.
        const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit 0/O/1/I
        function randomSuffix(len = 8): string {
          let s = "";
          for (let i = 0; i < len; i++) {
            s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }
          return s;
        }

        // 30-day validity from the SEND date — gives the customer some
        // breathing room without the code being usable forever.
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setUTCDate(validUntil.getUTCDate() + 30);

        for (const c of matches) {
          try {
            // Mint a unique per-customer promo code.
            const codeStr = `${(bday.promo_code_prefix || "BDAY").toUpperCase()}-${randomSuffix()}`;
            const { error: codeErr } = await admin
              .from("promo_codes")
              .insert({
                code: codeStr,
                description: `Birthday gift — ${bday.discount_percent}% off`,
                discount_type: "percentage",
                discount_value: bday.discount_percent,
                min_rental_days: 0,
                max_uses: 1, // single use
                times_used: 0,
                valid_from: validFrom.toISOString(),
                valid_until: validUntil.toISOString(),
                is_active: true,
                customer_id: c.id, // scope to this customer ONLY
                auto_generated: true,
                generated_by_event: "birthday",
              });
            if (codeErr) {
              console.error(
                "could not mint birthday code for",
                c.email,
                codeErr.message,
              );
              continue;
            }

            const subject = fill(bday.subject_template, c.first_name);
            const intro = fill(bday.intro_template, c.first_name);
            await notifyCustomer({
              type: "birthday_greeting",
              to: c.email,
              subject,
              heading: "A little birthday gift",
              intro,
              rows: [
                {
                  label: "Discount",
                  value: `${bday.discount_percent}% off any rental`,
                },
                { label: "Your personal code", value: codeStr },
                {
                  label: "Valid for",
                  value: "30 days, single use, your account only",
                },
              ],
              cta: { label: "Browse the Fleet", path: "/vehicles" },
            });
            await admin
              .from("customers")
              .update({ last_birthday_email_year: currentYear })
              .eq("id", c.id);
            counts.birthday++;
          } catch (e) {
            console.error("birthday email failed for", c.email, e);
          }
        }
      }
    } catch (e) {
      console.error("birthday loop failed", e);
    }

    // 9. Recurring marketing campaigns — find templates whose next_send_at
    //    has come due, clone each into a real one-off campaign, send it,
    //    advance the parent's next_send_at by recurrence_months.
    try {
      counts.recurring = await processDueRecurringCampaigns();
    } catch (e) {
      console.error("recurring campaigns loop failed", e);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder job failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ...counts });
}
