import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification, notifyCompany, notifyCustomer } from "@/lib/notifications";
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder job failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ...counts });
}
