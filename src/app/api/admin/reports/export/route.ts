import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodStart(period: string): string {
  const now = new Date();
  let d: Date;
  if (period === "year") d = new Date(now.getFullYear(), 0, 1);
  else if (period === "quarter") {
    d = new Date(now);
    d.setDate(d.getDate() - 90);
  } else if (period === "all") d = new Date(2000, 0, 1);
  else d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString();
}

/** Escape a value for CSV. */
function cell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface ExportRow {
  reservation_number: string;
  status: string;
  source: string;
  pickup_at: string;
  return_at: string;
  rental_days: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  customer: { first_name: string; last_name: string; email: string } | null;
  vehicle: { year: number; make: string; model: string } | null;
}

/** Exports reservations for a period as a CSV download. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const period = new URL(request.url).searchParams.get("period") ?? "month";
  const admin = createAdminClient();

  const { data } = await admin
    .from("reservations")
    .select(
      "reservation_number,status,source,pickup_at,return_at,rental_days,total,amount_paid,balance_due,payment_status,customer:customers(first_name,last_name,email),vehicle:vehicles(year,make,model)",
    )
    .gte("pickup_at", periodStart(period))
    .order("pickup_at", { ascending: false })
    .limit(5000);

  const rows = (data as unknown as ExportRow[]) ?? [];
  const header = [
    "Reservation", "Status", "Source", "Pickup", "Return", "Days",
    "Customer", "Email", "Vehicle", "Total", "Paid", "Balance", "Payment Status",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.reservation_number,
        r.status,
        r.source,
        r.pickup_at,
        r.return_at,
        r.rental_days,
        r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : "",
        r.customer?.email ?? "",
        r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}` : "",
        r.total,
        r.amount_paid,
        r.balance_due,
        r.payment_status,
      ]
        .map(cell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="car-mart-reservations-${period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
