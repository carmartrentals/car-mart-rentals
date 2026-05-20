import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import { formatDateTime } from "@/lib/utils";
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
  const counts = { pickup: 0, return: 0, overdue: 0, document: 0 };

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
      if (!r.customer?.email || (await alreadySent("overdue_alert", r.id))) continue;
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
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.overdue++;
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
      if (
        !r.customer?.email ||
        r.customer.documents_verified ||
        (await alreadySent("document_reminder", r.id))
      )
        continue;
      await sendNotification({
        type: "document_reminder",
        templateKey: "document_reminder",
        to: r.customer.email,
        variables: {
          customer_name: name(r),
          reservation_number: r.reservation_number,
        },
        reservationId: r.id,
        customerId: r.customer_id,
      });
      counts.document++;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder job failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ...counts });
}
