import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgreementDocument, type PdfLineItem } from "@/lib/pdf/documents";
import type {
  ReservationWithRelations, ReservationCharge, Agreement,
  AgreementTemplate, Inspection, AgreementSection,
} from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fetch a remote image and inline it as a base64 data URI (never throws). */
async function toDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") || "image/png";
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: resRow } = await admin
    .from("reservations")
    .select("*, customer:customers(*), vehicle:vehicles(*)")
    .eq("id", id)
    .maybeSingle();
  const reservation = resRow as ReservationWithRelations | null;
  if (!reservation) return new NextResponse("Reservation not found", { status: 404 });

  const [{ data: chargeRows }, { data: agreementRow }, { data: inspRow }] =
    await Promise.all([
      admin.from("reservation_charges").select("*").eq("reservation_id", id).order("created_at"),
      admin.from("agreements").select("*").eq("reservation_id", id).maybeSingle(),
      admin
        .from("inspections")
        .select("*")
        .eq("reservation_id", id)
        .eq("inspection_type", "checkout")
        .maybeSingle(),
    ]);

  const charges = (chargeRows as ReservationCharge[]) ?? [];
  const agreement = agreementRow as Agreement | null;
  const inspection = inspRow as Inspection | null;

  // Terms — from the agreement snapshot, else the default template.
  let terms: AgreementSection[] = agreement?.content ?? [];
  if (terms.length === 0) {
    const { data: tpl } = await admin
      .from("agreement_templates")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();
    terms = (tpl as AgreementTemplate | null)?.sections ?? [];
  }

  const [customerSig, staffSig] = await Promise.all([
    toDataUri(inspection?.customer_signature_url),
    toDataUri(inspection?.staff_signature_url),
  ]);

  const c = reservation.customer;
  const v = reservation.vehicle;

  const lineItems: PdfLineItem[] = charges.map((ch) => ({
    description: ch.description,
    qty: Number(ch.quantity),
    unit: Number(ch.unit_price),
    amount: Number(ch.amount),
  }));

  const buffer = await renderToBuffer(
    <AgreementDocument
      reservationNumber={reservation.reservation_number}
      customer={{
        name: c ? `${c.first_name} ${c.last_name}` : "—",
        email: c?.email,
        phone: c?.phone ?? undefined,
        address: [c?.address, c?.city, c?.state, c?.zip].filter(Boolean).join(", ") || undefined,
        detail: c?.dl_number
          ? `License ${c.dl_number}${c.dl_state ? ` (${c.dl_state})` : ""}`
          : undefined,
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
      charges={lineItems}
      subtotal={Number(reservation.subtotal)}
      tax={Number(reservation.tax_amount)}
      total={Number(reservation.total)}
      deposit={Number(reservation.deposit_amount)}
      amountPaid={Number(reservation.amount_paid)}
      balance={Number(reservation.balance_due)}
      terms={terms}
      customerSignature={customerSig}
      staffSignature={staffSig}
      generatedAt={new Date().toISOString()}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="agreement-${reservation.reservation_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
