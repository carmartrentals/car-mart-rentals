import { Satellite, MapPin, Navigation, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DeviceIdCell } from "@/components/admin/device-id-cell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import type { Vehicle } from "@/lib/types/database";

type Tone = "green" | "blue" | "amber" | "red" | "gray";

function gpsStatus(v: Vehicle): { label: string; tone: Tone } {
  if (!v.gps_last_ping_at) return { label: "No Data", tone: "gray" };
  const ageMin = (Date.now() - new Date(v.gps_last_ping_at).getTime()) / 60000;
  if (ageMin > 60) return { label: "Offline", tone: "red" };
  if (Number(v.gps_speed ?? 0) > 1) return { label: "Moving", tone: "blue" };
  return { label: "Parked", tone: "green" };
}

export default async function TrackingPage() {
  let vehicles: Vehicle[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vehicles")
      .select("*")
      .neq("status", "inactive")
      .order("make");
    vehicles = (data as Vehicle[]) ?? [];
  } catch {
    configError = true;
  }

  const rows = vehicles.map((v) => ({ v, status: gpsStatus(v) }));
  const moving = rows.filter((r) => r.status.label === "Moving").length;
  const parked = rows.filter((r) => r.status.label === "Parked").length;
  const live = vehicles.filter((v) => v.gps_last_ping_at).length;

  return (
    <>
      <PageHeader
        title="Vehicle Tracking"
        subtitle="Live GPS location of your fleet."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load vehicles. Run migration 0007 and check Supabase.
          </Alert>
        </div>
      )}

      {live === 0 && !configError && (
        <div className="mb-6">
          <Alert tone="info">
            No GPS data received yet. Assign each vehicle its PassTime device ID
            in the table below, then connect the GPS feed to the ingest endpoint
            (your team has the setup steps).
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vehicles" value={vehicles.length} icon={Satellite} />
        <StatCard label="Reporting" value={live} icon={MapPin} tone="blue" />
        <StatCard label="Moving Now" value={moving} icon={Navigation} tone="blue" />
        <StatCard label="Parked" value={parked} icon={MapPin} tone="green" />
      </div>

      <Card>
        {vehicles.length === 0 ? (
          <EmptyState
            icon={Satellite}
            title="No vehicles to track"
            description="Add vehicles to your fleet, then assign their GPS devices."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>GPS Device ID</TH>
                <TH>Status</TH>
                <TH>Location</TH>
                <TH>Speed</TH>
                <TH>Last Update</TH>
                <TH>Map</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ v, status }) => (
                <TR key={v.id}>
                  <TD className="font-medium text-slate-800">
                    {v.year} {v.make} {v.model}
                    <span className="block text-xs text-slate-400">
                      {v.license_plate || "No plate"}
                    </span>
                  </TD>
                  <TD>
                    <DeviceIdCell vehicleId={v.id} deviceId={v.gps_device_id} />
                  </TD>
                  <TD>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </TD>
                  <TD className="text-slate-600">
                    {v.gps_address
                      ? v.gps_address
                      : v.gps_latitude != null && v.gps_longitude != null
                        ? `${Number(v.gps_latitude).toFixed(5)}, ${Number(v.gps_longitude).toFixed(5)}`
                        : "—"}
                  </TD>
                  <TD className="text-slate-500">
                    {v.gps_speed != null ? `${Math.round(Number(v.gps_speed))} mph` : "—"}
                  </TD>
                  <TD className="text-slate-500">
                    {v.gps_last_ping_at ? formatDateTime(v.gps_last_ping_at) : "—"}
                  </TD>
                  <TD>
                    {v.gps_latitude != null && v.gps_longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${v.gps_latitude},${v.gps_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-gold-700 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </a>
                    ) : (
                      "—"
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
