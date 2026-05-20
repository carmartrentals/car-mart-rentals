/* eslint-disable jsx-a11y/alt-text */
import {
  Document, Page, View, Text, Image, StyleSheet,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface PdfParty {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  detail?: string;
}
export interface PdfVehicle {
  name: string;
  vin?: string;
  plate?: string;
  color?: string;
}
export interface PdfLineItem {
  description: string;
  qty: number;
  unit: number;
  amount: number;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const COLORS = {
  ink: "#1f2029",
  gold: "#a67c2a",
  gray: "#5f6170",
  light: "#f2f2f4",
  border: "#d9dade",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 9.5,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  brandSub: { fontSize: 7.5, color: COLORS.gold, letterSpacing: 2, marginTop: 2 },
  companyLine: { fontSize: 8, color: COLORS.gray, marginTop: 6 },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 8.5, color: COLORS.gray, textAlign: "right", marginTop: 3 },
  cols: { flexDirection: "row", gap: 16, marginBottom: 14 },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: COLORS.gold,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  box: {
    backgroundColor: COLORS.light, borderRadius: 4, padding: 9,
  },
  strong: { fontFamily: "Helvetica-Bold" },
  muted: { color: COLORS.gray },
  periodRow: {
    flexDirection: "row", borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, marginBottom: 14,
  },
  periodCell: {
    flex: 1, padding: 9, borderRightWidth: 1, borderRightColor: COLORS.border,
  },
  periodCellLast: { flex: 1, padding: 9 },
  tableHead: {
    flexDirection: "row", backgroundColor: COLORS.ink, color: "#ffffff",
    paddingVertical: 6, paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  thDesc: { flex: 4, fontSize: 8, fontFamily: "Helvetica-Bold" },
  thQty: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  thAmt: { flex: 1.4, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  tdDesc: { flex: 4 },
  tdQty: { flex: 1, textAlign: "right" },
  tdAmt: { flex: 1.4, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 220 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5,
  },
  totalGrand: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: COLORS.ink, marginTop: 4, paddingTop: 5,
  },
  balanceBox: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: COLORS.ink, color: "#ffffff", borderRadius: 4,
    padding: 9, marginTop: 6,
  },
  termTitle: {
    fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 1,
  },
  termBody: { fontSize: 8, color: COLORS.gray },
  sigRow: { flexDirection: "row", gap: 24, marginTop: 22 },
  sigBlock: { flex: 1 },
  sigImage: { height: 38, marginBottom: 2 },
  sigLine: {
    borderBottomWidth: 1, borderBottomColor: COLORS.ink, height: 38,
  },
  sigLabel: { fontSize: 7.5, color: COLORS.gray, marginTop: 3 },
  footer: {
    position: "absolute", bottom: 24, left: 44, right: 44,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6,
    fontSize: 7.5, color: COLORS.gray, flexDirection: "row",
    justifyContent: "space-between",
  },
});

// ---------------------------------------------------------------------------
// Shared header / footer / blocks
// ---------------------------------------------------------------------------
function Header({ title, meta }: { title: string; meta: string[] }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>CAR MART RENTALS</Text>
        <Text style={s.brandSub}>LUXURY &amp; INSURANCE REPLACEMENT RENTALS</Text>
        <Text style={s.companyLine}>{COMPANY.address}</Text>
        <Text style={s.companyLine}>
          {COMPANY.phone} · {COMPANY.email}
        </Text>
      </View>
      <View>
        <Text style={s.docTitle}>{title}</Text>
        {meta.map((m, i) => (
          <Text key={i} style={s.docMeta}>{m}</Text>
        ))}
      </View>
    </View>
  );
}

function PartyBlock({ label, party }: { label: string; party: PdfParty }) {
  return (
    <View style={s.col}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.box}>
        <Text style={s.strong}>{party.name}</Text>
        {party.detail ? <Text style={s.muted}>{party.detail}</Text> : null}
        {party.address ? <Text style={s.muted}>{party.address}</Text> : null}
        {party.phone ? <Text style={s.muted}>{party.phone}</Text> : null}
        {party.email ? <Text style={s.muted}>{party.email}</Text> : null}
      </View>
    </View>
  );
}

function VehicleBlock({ vehicle }: { vehicle: PdfVehicle }) {
  return (
    <View style={s.col}>
      <Text style={s.sectionLabel}>Vehicle</Text>
      <View style={s.box}>
        <Text style={s.strong}>{vehicle.name}</Text>
        {vehicle.plate ? <Text style={s.muted}>Plate: {vehicle.plate}</Text> : null}
        {vehicle.vin ? <Text style={s.muted}>VIN: {vehicle.vin}</Text> : null}
        {vehicle.color ? <Text style={s.muted}>Color: {vehicle.color}</Text> : null}
      </View>
    </View>
  );
}

function Period({
  pickupAt, returnAt, days,
}: {
  pickupAt: string;
  returnAt: string;
  days: number;
}) {
  return (
    <View style={s.periodRow}>
      <View style={s.periodCell}>
        <Text style={s.sectionLabel}>Pickup</Text>
        <Text>{formatDateTime(pickupAt)}</Text>
      </View>
      <View style={s.periodCell}>
        <Text style={s.sectionLabel}>Return</Text>
        <Text>{formatDateTime(returnAt)}</Text>
      </View>
      <View style={s.periodCellLast}>
        <Text style={s.sectionLabel}>Duration</Text>
        <Text>{days} day(s)</Text>
      </View>
    </View>
  );
}

function ChargesTable({ items }: { items: PdfLineItem[] }) {
  return (
    <View>
      <View style={s.tableHead}>
        <Text style={s.thDesc}>Description</Text>
        <Text style={s.thQty}>Qty</Text>
        <Text style={s.thAmt}>Unit</Text>
        <Text style={s.thAmt}>Amount</Text>
      </View>
      {items.length === 0 ? (
        <View style={s.tableRow}>
          <Text style={s.muted}>No charges recorded.</Text>
        </View>
      ) : (
        items.map((it, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdDesc}>{it.description}</Text>
            <Text style={s.tdQty}>{it.qty}</Text>
            <Text style={s.tdAmt}>{formatCurrency(it.unit)}</Text>
            <Text style={s.tdAmt}>{formatCurrency(it.amount)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function Footer({ note }: { note: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{COMPANY.name}</Text>
      <Text>{note}</Text>
    </View>
  );
}

// ===========================================================================
// RENTAL AGREEMENT
// ===========================================================================
export interface AgreementDocProps {
  reservationNumber: string;
  customer: PdfParty;
  vehicle: PdfVehicle;
  pickupAt: string;
  returnAt: string;
  rentalDays: number;
  charges: PdfLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  deposit: number;
  amountPaid: number;
  balance: number;
  terms: { title: string; body: string }[];
  customerSignature?: string | null;
  staffSignature?: string | null;
  generatedAt: string;
}

export function AgreementDocument(props: AgreementDocProps) {
  return (
    <Document
      title={`Rental Agreement ${props.reservationNumber}`}
      author={COMPANY.name}
    >
      <Page size="LETTER" style={s.page}>
        <Header
          title="RENTAL AGREEMENT"
          meta={[
            `Agreement: ${props.reservationNumber}`,
            `Issued: ${formatDate(props.generatedAt)}`,
          ]}
        />

        <View style={s.cols}>
          <PartyBlock label="Renter" party={props.customer} />
          <VehicleBlock vehicle={props.vehicle} />
        </View>

        <Period
          pickupAt={props.pickupAt}
          returnAt={props.returnAt}
          days={props.rentalDays}
        />

        <Text style={s.sectionLabel}>Charges</Text>
        <ChargesTable items={props.charges} />

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{formatCurrency(props.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Tax</Text>
            <Text>{formatCurrency(props.tax)}</Text>
          </View>
          <View style={s.totalGrand}>
            <Text style={s.strong}>Total</Text>
            <Text style={s.strong}>{formatCurrency(props.total)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Security Deposit (refundable)</Text>
            <Text>{formatCurrency(props.deposit)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Amount Paid</Text>
            <Text>{formatCurrency(props.amountPaid)}</Text>
          </View>
          <View style={s.balanceBox}>
            <Text style={s.strong}>Balance Due</Text>
            <Text style={s.strong}>{formatCurrency(props.balance)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionLabel}>Terms &amp; Conditions</Text>
          {props.terms.map((t, i) => (
            <View key={i} wrap={false}>
              <Text style={s.termTitle}>
                {i + 1}. {t.title}
              </Text>
              <Text style={s.termBody}>{t.body}</Text>
            </View>
          ))}
        </View>

        <View style={s.sigRow} wrap={false}>
          <View style={s.sigBlock}>
            {props.customerSignature ? (
              <Image style={s.sigImage} src={props.customerSignature} />
            ) : (
              <View style={s.sigLine} />
            )}
            <Text style={s.sigLabel}>
              Renter Signature — {props.customer.name}
            </Text>
          </View>
          <View style={s.sigBlock}>
            {props.staffSignature ? (
              <Image style={s.sigImage} src={props.staffSignature} />
            ) : (
              <View style={s.sigLine} />
            )}
            <Text style={s.sigLabel}>Authorized Agent — {COMPANY.name}</Text>
          </View>
        </View>

        <Footer note={`Agreement ${props.reservationNumber}`} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// INVOICE
// ===========================================================================
export interface InvoiceDocProps {
  invoiceNumber: string;
  generatedAt: string;
  dueDate?: string | null;
  reservationNumber: string;
  customer: PdfParty;
  vehicle: PdfVehicle;
  pickupAt: string;
  returnAt: string;
  rentalDays: number;
  lineItems: PdfLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  payments: { date: string; method: string; amount: number }[];
}

export function InvoiceDocument(props: InvoiceDocProps) {
  return (
    <Document title={`Invoice ${props.invoiceNumber}`} author={COMPANY.name}>
      <Page size="LETTER" style={s.page}>
        <Header
          title="INVOICE"
          meta={[
            `Invoice: ${props.invoiceNumber}`,
            `Reservation: ${props.reservationNumber}`,
            `Date: ${formatDate(props.generatedAt)}`,
            ...(props.dueDate ? [`Due: ${formatDate(props.dueDate)}`] : []),
          ]}
        />

        <View style={s.cols}>
          <PartyBlock label="Bill To" party={props.customer} />
          <VehicleBlock vehicle={props.vehicle} />
        </View>

        <Period
          pickupAt={props.pickupAt}
          returnAt={props.returnAt}
          days={props.rentalDays}
        />

        <Text style={s.sectionLabel}>Line Items</Text>
        <ChargesTable items={props.lineItems} />

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{formatCurrency(props.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Tax</Text>
            <Text>{formatCurrency(props.tax)}</Text>
          </View>
          <View style={s.totalGrand}>
            <Text style={s.strong}>Total</Text>
            <Text style={s.strong}>{formatCurrency(props.total)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Amount Paid</Text>
            <Text>{formatCurrency(props.amountPaid)}</Text>
          </View>
          <View style={s.balanceBox}>
            <Text style={s.strong}>Balance Due</Text>
            <Text style={s.strong}>{formatCurrency(props.balance)}</Text>
          </View>
        </View>

        {props.payments.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.sectionLabel}>Payments Received</Text>
            {props.payments.map((p, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tdDesc}>
                  {formatDate(p.date)} · {p.method}
                </Text>
                <Text style={s.tdAmt}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ marginTop: 20, fontSize: 8.5, color: COLORS.gray }}>
          Thank you for choosing {COMPANY.name}. Please remit any balance due by
          the date above. Questions? Contact {COMPANY.phone}.
        </Text>

        <Footer note={`Invoice ${props.invoiceNumber}`} />
      </Page>
    </Document>
  );
}
