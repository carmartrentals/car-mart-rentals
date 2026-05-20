import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider-agnostic GPS ingest endpoint.
 *
 * Any telematics provider (PassTime, a connector, or a script) POSTs vehicle
 * location updates here. The vehicle is matched by `gps_device_id`.
 *
 *   Auth:  Authorization: Bearer <GPS_INGEST_SECRET>
 *   Body:  { device_id, latitude, longitude, speed?, heading?, ignition?,
 *            address?, battery?, odometer?, provider?, timestamp? }
 */
export async function POST(request: Request) {
  const secret = process.env.GPS_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "GPS ingest is not configured. Set GPS_INGEST_SECRET." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const deviceId = String(body.device_id ?? "").trim();
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!deviceId) {
    return NextResponse.json({ error: "device_id is required." }, { status: 422 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("gps_device_id", deviceId)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json(
      { error: `No vehicle is assigned GPS device "${deviceId}".` },
      { status: 404 },
    );
  }

  const ts = body.timestamp ? new Date(String(body.timestamp)) : new Date();
  const update: Record<string, unknown> = {
    gps_latitude: lat,
    gps_longitude: lng,
    gps_last_ping_at: (Number.isNaN(ts.getTime()) ? new Date() : ts).toISOString(),
    gps_provider: body.provider ? String(body.provider) : "passtime",
  };
  if (body.speed != null) update.gps_speed = Number(body.speed);
  if (body.heading != null) update.gps_heading = Math.round(Number(body.heading));
  if (body.ignition != null) update.gps_ignition = Boolean(body.ignition);
  if (body.address != null) update.gps_address = String(body.address);
  if (body.battery != null) update.gps_battery = Math.round(Number(body.battery));
  if (body.odometer != null) update.odometer = Math.round(Number(body.odometer));

  const { error } = await admin
    .from("vehicles")
    .update(update)
    .eq("id", vehicle.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vehicle_id: vehicle.id });
}
