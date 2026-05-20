import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { customerOwnsReservation } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyProfile } from "@/lib/data/settings";
import { InvoiceDocument, type PdfLineItem } from "@/lib/pdf/documents";
import { titleCase } from "@/lib/utils";
import type {
  ReservationWithRelations, ReservationCharge, Payment, Invoice,
} from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates an invoice PDF for a reservation. Uses the formal invoice record
 * if one exists (e.g. created at check-in), otherwise renders a current
 * statement from the reservation's live totals.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user && !(await customerOwnsReservation(id))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: resRow } = await admin
    .from("reservations")
    .select("*, customer:customers(*), vehicle:vehicles(*)")
    .eq("id", id)
    .maybeSingle();
  const reservation = resRow as ReservationWithRelations | null;
  if (!reservation) return new NextResponse("Reservation not found", { status: 404 });

  const [{ data: chargeRows }, { data: paymentRows }, { data: invoiceRow }] =
    await Promise.all([
      admin.from("reservation_charges").select("*").eq("reservation_id", id).order("created_at"),
      admin
        .from("payments")
        .select("*")
        .eq("reservation_id", id)
        .eq("status", "succeeded")
        .order("created_at"),
      admin
        .from("invoices")
        .select("*")
        .eq("reservation_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const charges = (chargeRows as ReservationCharge[]) ?? [];
  const payments = (paymentRows as Payment[]) ?? [];
  const invoice = invoiceRow as Invoice | null;

  const c = reservation.customer;
  const v = reservation.vehicle;

  const lineItems: PdfLineItem[] = charges.map((ch) => ({
    description: ch.description,
    qty: Number(ch.quantity),
    unit: Number(ch.unit_price),
    amount: Number(ch.amount),
  }));

  const company = await getCompanyProfile();

  const buffer = await renderToBuffer(
    <InvoiceDocument
      company={{
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
      }}
      invoiceNumber={invoice?.invoice_number ?? `DRAFT-${reservation.reservation_number}`}
      generatedAt={invoice?.issued_date ?? new Date().toISOString()}
      dueDate={invoice?.due_date ?? null}
      reservationNumber={reservation.reservation_number}
      customer={{
        name: c ? `${c.first_name} ${c.last_name}` : "—",
        email: c?.email,
        phone: c?.phone ?? undefined,
        address: [c?.address, c?.city, c?.state, c?.zip].filter(Boolean).join(", ") || undefined,
      }}
      vehicle={{
        name: v ? `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}` : "—",
        vin: v?.vin ?? undefined,
        plate: v?.license_plate ?? undefined,
        color: v?.color ?? undefined,
      }}
      pickupAt={reservation.pickup_at}
      returnAt={reservation.return_at}
      rentalDays={reservation.rental_days}
      lineItems={lineItems}
      subtotal={Number(reservation.subtotal)}
      tax={Number(reservation.tax_amount)}
      total={Number(reservation.total)}
      amountPaid={Number(reservation.amount_paid)}
      balance={Number(reservation.balance_due)}
      payments={payments.map((p) => ({
        date: p.created_at,
        method: titleCase(p.method),
        amount: Number(p.amount),
      }))}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${reservation.reservation_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
