import {
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Users,
  Car,
  CreditCard,
  Megaphone,
  Sparkles,
  Settings as SettingsIcon,
  AlertCircle,
} from "lucide-react";

/**
 * Internal admin documentation — onboarding + reference for staff. Doc
 * content lives inline as JSX so it gets type-checked + can use the same
 * styling primitives as the rest of the app, with no external markdown
 * dependency.
 *
 * To add a new doc: append a new object to the topics array for its
 * category. To add a new category: add to ADMIN_DOC_CATEGORIES below.
 */

export interface AdminDoc {
  slug: string;
  title: string;
  /** One-line summary shown in the sidebar + index. */
  description: string;
  /** Last-updated date — bump when you edit. Shows on the doc page. */
  updatedAt: string;
  content: React.ReactNode;
}

export interface AdminDocCategory {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  topics: AdminDoc[];
}

// ---------- Reusable content blocks --------------------------------------

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900 first:mt-0">
      {children}
    </h2>
  );
}
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-slate-800">{children}</h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-slate-700">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700 marker:text-slate-400">
      {children}
    </ul>
  );
}
function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700 marker:text-slate-400">
      {children}
    </ol>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
      {children}
    </code>
  );
}
function Tip({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const tone =
    variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : variant === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <div className={`mt-4 rounded-lg border ${tone} p-3 text-sm`}>
      {children}
    </div>
  );
}

// ---------- Category 1: Getting Started ----------------------------------

const gettingStarted: AdminDoc[] = [
  {
    slug: "welcome",
    title: "Welcome",
    description: "What this system does and how to think about it.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          This is the Car Mart Rentals admin panel — your one place to run
          the whole rental business: fleet, customers, bookings, payments,
          marketing, and the AI receptionist.
        </P>
        <H2>What you&apos;ll do here every day</H2>
        <UL>
          <li>
            See today&apos;s pickups and returns on the <strong>Calendar</strong> + <strong>Dashboard</strong>
          </li>
          <li>
            Check vehicles in and out on the <strong>Check-in / out</strong> page
          </li>
          <li>
            Review new bookings + verify documents on <strong>Reservations</strong> and <strong>Customers</strong>
          </li>
          <li>
            Process payments + refunds on the reservation detail page
          </li>
        </UL>
        <H2>What runs on autopilot</H2>
        <UL>
          <li>
            <strong>AI Phone Receptionist</strong> — answers your phone 24/7, books, transfers
          </li>
          <li>
            <strong>Auto-emails</strong> — pre-check-in, pickup reminders, thanks, birthday discount codes
          </li>
          <li>
            <strong>Abandoned-booking recovery</strong> — nudges customers who started a booking but didn&apos;t finish
          </li>
          <li>
            <strong>AI document checks</strong> — license + insurance verification before pickup
          </li>
        </UL>
        <Tip>
          New to the system? Read <strong>Daily admin workflow</strong> next.
          It walks through a typical day end-to-end.
        </Tip>
      </>
    ),
  },
  {
    slug: "daily-workflow",
    title: "Daily admin workflow",
    description: "A typical day, from morning open to evening close.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <H2>Morning (start of shift)</H2>
        <OL>
          <li>
            Open the <strong>Dashboard</strong> — see today&apos;s pickups, returns, overdue alerts.
          </li>
          <li>
            Check the <strong>Phone Calls</strong> page for any AI-handled
            calls overnight. Look at the AI summary + intent of each.
          </li>
          <li>
            Click <strong>Calendar</strong> to see the day&apos;s schedule visually.
          </li>
        </OL>

        <H2>For each pickup today</H2>
        <OL>
          <li>
            On the reservation, scroll to <strong>Documents &amp; Verification</strong> — confirm the green &quot;Ready for pickup&quot; badge.
          </li>
          <li>
            If red &quot;Pickup blocked&quot;, fix the missing item (verify license, collect deposit, etc.) before the customer arrives.
          </li>
          <li>
            When the customer arrives, click <strong>Check-in / Check-out</strong> from the reservation, then follow the check-out workflow.
          </li>
        </OL>

        <H2>For each return today</H2>
        <OL>
          <li>
            From the reservation page, click <strong>Check-in / Check-out</strong> and select Check-in.
          </li>
          <li>
            Take 6–8 photos of the returned vehicle. The AI compares to the pickup photos and flags new damage.
          </li>
          <li>
            Record fuel level, odometer, cleanliness. Review any damage findings.
          </li>
          <li>
            If everything&apos;s clean, release the deposit. If there&apos;s damage, capture the deposit + create a damage claim.
          </li>
        </OL>

        <H2>End of day</H2>
        <UL>
          <li>
            Check the <strong>Reports</strong> page for today&apos;s revenue.
          </li>
          <li>
            Review any pending <strong>Reservation Requests</strong> (extensions, early returns).
          </li>
          <li>
            Skim the <strong>Audit Log</strong> if multiple staff worked today.
          </li>
        </UL>
      </>
    ),
  },
  {
    slug: "sidebar-tour",
    title: "Sidebar tour — what each section does",
    description: "Quick reference for every link in the left sidebar.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <H2>Operations</H2>
        <UL>
          <li>
            <strong>Dashboard</strong> — today at a glance: KPIs, alerts, upcoming pickups/returns
          </li>
          <li>
            <strong>Ask AI</strong> — chat with your business data (e.g. &quot;What was my revenue last month?&quot;)
          </li>
          <li>
            <strong>Calendar</strong> — visual timeline of all reservations
          </li>
          <li>
            <strong>Reservations</strong> — full reservation list + create new bookings
          </li>
          <li>
            <strong>Check-in / out</strong> — pickup + return workflows
          </li>
          <li>
            <strong>Phone Calls</strong> — every call the AI receptionist took, with transcripts + cost
          </li>
        </UL>

        <H2>Fleet</H2>
        <UL>
          <li>
            <strong>Vehicles</strong> — your cars: add new, edit pricing, upload photos
          </li>
          <li>
            <strong>Maintenance</strong> — service history per vehicle
          </li>
          <li>
            <strong>Damages</strong> — recorded damage incidents
          </li>
          <li>
            <strong>Tolls &amp; Violations</strong> — pass toll charges through to customers
          </li>
          <li>
            <strong>Tracking</strong> — GPS data if you have devices installed
          </li>
          <li>
            <strong>Insurance Claims</strong> — manage claim numbers + adjuster info
          </li>
        </UL>

        <H2>People</H2>
        <UL>
          <li>
            <strong>Customers</strong> — all renters, with their docs + verification status
          </li>
          <li>
            <strong>Leads</strong> — contact form submissions that haven&apos;t booked yet
          </li>
          <li>
            <strong>Reviews</strong> — moderate the reviews shown on your website
          </li>
          <li>
            <strong>Referrals</strong> — who referred whom + reward tracking
          </li>
        </UL>

        <H2>Finance</H2>
        <UL>
          <li>
            <strong>Invoices</strong> — list of completed reservations + their totals
          </li>
          <li>
            <strong>Payments</strong> — all Stripe payments
          </li>
          <li>
            <strong>Expenses</strong> — fuel, maintenance, your own costs
          </li>
          <li>
            <strong>Promo Codes</strong> — discount codes customers can use
          </li>
          <li>
            <strong>Dynamic Pricing</strong> — AI suggestions for raising/lowering rates
          </li>
          <li>
            <strong>Marketing Campaigns</strong> — email blasts + automation
          </li>
          <li>
            <strong>Reports</strong> — revenue, fleet utilization, true profit
          </li>
        </UL>

        <H2>System</H2>
        <UL>
          <li>
            <strong>Locations</strong> — your pickup locations
          </li>
          <li>
            <strong>Email Templates</strong> — customize the transactional emails
          </li>
          <li>
            <strong>Website Content</strong> — edit the public website&apos;s page text
          </li>
          <li>
            <strong>Staff Users</strong> — invite other team members, set roles
          </li>
          <li>
            <strong>Audit Log</strong> — every change made by every staff member
          </li>
          <li>
            <strong>Settings</strong> — company info, taxes, AI receptionist, cancellation policy, etc.
          </li>
          <li>
            <strong>Documentation</strong> — this section (you&apos;re here)
          </li>
        </UL>
      </>
    ),
  },
];

// ---------- Category 2: Reservations -------------------------------------

const reservations: AdminDoc[] = [
  {
    slug: "create-reservation",
    title: "Creating a reservation (the wizard)",
    description: "Step-by-step booking flow for staff-created reservations.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          When a customer calls or walks in, create the reservation from{" "}
          <strong>Reservations → + New Reservation</strong>. The form is a
          5-step wizard with help text on each step.
        </P>
        <H2>Step 1 — Customer</H2>
        <UL>
          <li>Pick an existing customer from the dropdown.</li>
          <li>
            If they&apos;re new, click <strong>+ Add Customer</strong> (opens in a new tab so you don&apos;t lose the wizard), create the record, come back, refresh.
          </li>
          <li>Verified customers show with a green DL badge in the dropdown.</li>
        </UL>
        <H2>Step 2 — Vehicle</H2>
        <P>
          Each vehicle shows its base daily rate. The wizard preview shows
          the live photo + rate tiers (daily/weekly/monthly) as soon as you
          pick one.
        </P>
        <H2>Step 3 — Dates</H2>
        <UL>
          <li>Set pickup + return date and time.</li>
          <li>
            The system auto-picks the best rate tier (daily, weekend, weekly, monthly) once both dates are set.
          </li>
          <li>
            A green callout appears showing the day count + which rate tier applied.
          </li>
        </UL>
        <H2>Step 4 — Pricing</H2>
        <UL>
          <li>
            Leave <strong>Rate Override</strong> blank to use the auto-picked best rate.
          </li>
          <li>
            Only override if you negotiated a custom rate for this customer.
          </li>
          <li>
            For one-off discounts, use the <strong>Discount $</strong> field +{" "}
            <strong>Reason</strong> (audit log requirement).
          </li>
        </UL>
        <H2>Step 5 — Review</H2>
        <UL>
          <li>
            <strong>Status:</strong> Pending = holding the car, waiting for payment. Confirmed = fully booked.
          </li>
          <li>
            <strong>Source:</strong> Tells you how the booking came in (Phone, Walk-in, Website, etc).
          </li>
          <li>
            <strong>Customer Notes</strong> appear on the invoice; <strong>Internal Notes</strong> are staff-only.
          </li>
        </UL>
        <Tip>
          The price summary in the sidebar updates live as you fill in the
          wizard, so you can quote the customer without finishing the form.
        </Tip>
      </>
    ),
  },
  {
    slug: "reservation-statuses",
    title: "Reservation status workflow",
    description: "What pending / confirmed / active / completed mean.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <H2>The 5 statuses</H2>
        <UL>
          <li>
            <strong>Pending</strong> — booking created, waiting for payment or doc verification. Vehicle is held but not committed.
          </li>
          <li>
            <strong>Confirmed</strong> — payment + docs OK. Vehicle is fully booked for this customer.
          </li>
          <li>
            <strong>Active</strong> — customer picked up the vehicle. Set automatically when you complete check-out.
          </li>
          <li>
            <strong>Completed</strong> — vehicle returned. Set automatically when you complete check-in.
          </li>
          <li>
            <strong>Cancelled</strong> — booking is dead. Vehicle is freed up.
          </li>
        </UL>

        <H2>How status changes happen</H2>
        <P>
          Most transitions happen automatically when you do the
          corresponding action (check-out → active, check-in → completed).
          You can also flip status manually from the reservation page if
          something special happens.
        </P>
        <Tip variant="warning">
          Cancelling a reservation does NOT auto-refund. You have to issue
          the refund manually from the Payments panel. See{" "}
          <strong>Financials → Refunds</strong>.
        </Tip>
      </>
    ),
  },
  {
    slug: "ai-risk-assessment",
    title: "AI risk assessment on bookings",
    description: "What the green / amber / red risk badge means.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          Every reservation gets an AI risk score based on the customer&apos;s
          history, document state, booking value, and how last-minute the
          booking is.
        </P>
        <H2>Levels</H2>
        <UL>
          <li>
            <strong>Low (green)</strong> — verified repeat customer, normal booking. Process as usual.
          </li>
          <li>
            <strong>Medium (amber)</strong> — new customer or some unusual signal. Worth a glance before check-out.
          </li>
          <li>
            <strong>High (red)</strong> — multiple red flags. Manually verify the customer + consider requiring extra deposit or declining.
          </li>
        </UL>
        <H2>What feeds the score</H2>
        <UL>
          <li>Customer age + how recently they registered</li>
          <li>Documents on file + verification status</li>
          <li>Vehicle value vs. customer&apos;s rental history</li>
          <li>Last-minute bookings (less than 24h ahead) score higher risk</li>
          <li>Past no-shows, late returns, cancellations</li>
          <li>Blacklist status</li>
        </UL>
        <Tip>
          Click <strong>Re-run AI Check</strong> on the reservation page if
          you&apos;ve just updated the customer&apos;s docs — the score
          recalculates with fresh data.
        </Tip>
      </>
    ),
  },
];

// ---------- Category 3: Check-in & Check-out -----------------------------

const checkInOut: AdminDoc[] = [
  {
    slug: "checkout-workflow",
    title: "Check-out workflow (picking up the car)",
    description: "Step-by-step what to do when a customer arrives for pickup.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <OL>
          <li>Go to the reservation, click <strong>Check-in / Check-out</strong>.</li>
          <li>Select <strong>Check-out</strong>.</li>
          <li>
            Record <strong>odometer</strong> + <strong>fuel level</strong> from the dashboard.
          </li>
          <li>
            Take 6–8 photos of the vehicle — exterior all sides + interior. These become the baseline for AI damage detection on return.
          </li>
          <li>
            Mark <strong>Exterior clean</strong> + <strong>Interior clean</strong>.
          </li>
          <li>
            Optionally add notes (e.g. &quot;Pre-existing scratch on rear bumper&quot;).
          </li>
          <li>
            Verify the customer can drive: green &quot;Ready for pickup&quot; badge in the docs section. If red, fix the blocker first.
          </li>
          <li>
            Click <strong>Complete Check-out</strong>. Reservation flips to{" "}
            <strong>Active</strong>. Vehicle is now in the customer&apos;s
            possession according to the system.
          </li>
        </OL>
        <Tip>
          The agreement PDF is auto-generated from the template editor.
          Print it or email it to the customer before they drive off.
        </Tip>
      </>
    ),
  },
  {
    slug: "checkin-workflow",
    title: "Check-in workflow (returning the car)",
    description: "What to do when the customer brings the car back.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <OL>
          <li>Go to the reservation → <strong>Check-in / Check-out</strong> → Check-in.</li>
          <li>
            Record returned <strong>odometer</strong> + <strong>fuel level</strong>.
          </li>
          <li>
            Take 6–8 return photos — same angles as the pickup photos.
          </li>
          <li>
            Hit <strong>Run AI Damage Scan</strong>. The AI compares pickup vs return photos and highlights new damage with estimated repair costs.
          </li>
          <li>
            Review findings. If false positives (e.g. dust looks like a scratch), discard them.
          </li>
          <li>
            Mark cleanliness. If interior is dirty, add the standard cleaning fee.
          </li>
          <li>
            Click <strong>Complete Check-in</strong>.
          </li>
        </OL>
        <H2>After completing</H2>
        <UL>
          <li>
            <strong>No damage:</strong> Release the deposit (Payments panel → Deposit → Release).
          </li>
          <li>
            <strong>Has damage:</strong> Capture the deposit (or portion of it) → create a damage claim.
          </li>
          <li>
            <strong>Customer owes more:</strong> Charge the additional amount via the Payments panel.
          </li>
        </UL>
      </>
    ),
  },
  {
    slug: "ai-damage-detection",
    title: "AI damage detection",
    description: "How the photo comparison works and when to trust it.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          The AI compares your pickup photos to the return photos and
          highlights areas where new damage appears. Each finding includes
          location, description, severity, and an estimated repair cost.
        </P>
        <H2>When it works well</H2>
        <UL>
          <li>You took clear, well-lit pickup photos at the same angles as return</li>
          <li>The damage is visually obvious (dents, scratches, cracks)</li>
          <li>Both sets of photos were taken in similar lighting</li>
        </UL>
        <H2>When to override it</H2>
        <UL>
          <li>
            <strong>Dirt/dust looking like scratches</strong> — common false positive
          </li>
          <li>
            <strong>Different lighting making shadows look like dents</strong>
          </li>
          <li>
            <strong>Estimated cost obviously off</strong> — AI guesses based on damage description, can be way high or way low
          </li>
        </UL>
        <Tip variant="warning">
          The cost estimates are starting points, NOT final quotes. Always
          get a real shop estimate before charging the customer&apos;s
          deposit for anything significant.
        </Tip>
      </>
    ),
  },
];

// ---------- Category 4: Customers ----------------------------------------

const customers: AdminDoc[] = [
  {
    slug: "verifying-licenses",
    title: "Verifying driver licenses",
    description: "AI photo check + manual DMV check + Stripe Identity.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          You can require any combination of three verification checks
          before allowing check-out. Configure which from{" "}
          <strong>Settings → Verification Levels</strong>.
        </P>
        <H2>1. AI Photo Check</H2>
        <P>
          Free, instant. GPT-4o-mini inspects the uploaded license photo
          for authenticity (forgery signs, expired date, mismatched name).
          Returns a score 0-100 with flagged issues.
        </P>
        <P>
          On the customer detail page, click <strong>Run AI Check</strong>{" "}
          under License Verification. Auto-fills License #, State,
          Expiration, DOB from the image.
        </P>

        <H2>2. Manual DMV Check</H2>
        <P>
          For high-value rentals: look up the license on your state DMV
          portal (CA: dmv.ca.gov), confirm it&apos;s valid/active, then
          click <strong>Record DMV Result</strong> on the customer page.
        </P>

        <H2>3. Stripe Identity</H2>
        <P>
          Customer completes a Stripe-hosted ID + selfie verification.
          Costs ~$1.50 per check, strongest fraud protection. Available
          from the customer&apos;s portal &quot;Verify with Stripe&quot;
          button.
        </P>

        <Tip>
          For luxury vehicles, AI + Stripe is the recommended combo.
          Configure this once in Settings, then every new booking enforces
          it automatically.
        </Tip>
      </>
    ),
  },
  {
    slug: "verifying-insurance",
    title: "Verifying insurance",
    description: "AI document inspection for proof-of-insurance.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          Same idea as license verification but for insurance cards. The AI
          checks the document for authenticity, reads the company / policy
          number / expiration / named insured, and flags concerns.
        </P>
        <H2>Flags to watch</H2>
        <UL>
          <li><strong>Expired</strong> — policy past expiration date</li>
          <li><strong>Name mismatch</strong> — insured doesn&apos;t match the customer record</li>
          <li><strong>Liability-only</strong> — no comprehensive coverage, customer is on the hook for vehicle damage</li>
          <li><strong>Vehicle-specific</strong> — policy only covers one VIN, may not extend to rentals</li>
          <li><strong>Not an insurance doc</strong> — uploaded the wrong file</li>
        </UL>
        <H2>Setting strictness</H2>
        <P>
          From <strong>Settings → Verification Levels</strong>:
        </P>
        <UL>
          <li><strong>Not required</strong> — skip insurance check</li>
          <li><strong>Upload required</strong> — must have a file on record</li>
          <li><strong>Upload + AI score must pass</strong> — must score above your minimum threshold</li>
        </UL>
      </>
    ),
  },
  {
    slug: "vip-blacklist",
    title: "VIP + blacklist",
    description: "Flagging customers for preferential or restricted treatment.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <H2>Marking a VIP</H2>
        <P>
          On the customer page, toggle the <strong>VIP</strong> flag. VIPs
          get a gold star badge throughout the system. Useful for:
        </P>
        <UL>
          <li>Targeted VIP-only marketing campaigns</li>
          <li>Visual recognition for staff during check-out</li>
          <li>Lower AI risk scores on their bookings</li>
        </UL>
        <H2>Blacklisting</H2>
        <P>
          For customers banned from future rentals (damaged vehicle, bad
          behavior, fraud). Toggle <strong>Blacklisted</strong> + add a
          reason.
        </P>
        <UL>
          <li>System prevents new bookings + sends a clear admin warning</li>
          <li>Marketing emails skip blacklisted customers automatically</li>
          <li>Reason is kept in the audit log forever</li>
        </UL>
      </>
    ),
  },
];

// ---------- Category 5: Financials ---------------------------------------

const financials: AdminDoc[] = [
  {
    slug: "deposits",
    title: "Security deposits (Stripe holds)",
    description: "How holds, captures, and releases work.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          Deposits use Stripe&apos;s manual-capture flow. The system places
          a <strong>hold</strong> on the customer&apos;s card — money
          isn&apos;t moved, just reserved. You then either{" "}
          <strong>capture</strong> it (charge for damage) or{" "}
          <strong>release</strong> it (cancel the hold, customer is never charged).
        </P>
        <H2>Authorization (hold)</H2>
        <P>
          Triggered when the customer pays the deposit via the portal or
          when staff initiates from the Payments panel. Default hold
          duration: 7 days (Stripe limit).
        </P>
        <H2>Release</H2>
        <P>
          When the customer returns the vehicle clean, click{" "}
          <strong>Release Deposit</strong>. The hold is removed — customer
          never sees a charge.
        </P>
        <H2>Capture (for damage)</H2>
        <P>
          When you need to charge for damage, late return, etc, click{" "}
          <strong>Capture Deposit</strong>. Specify the amount (can be
          partial — the rest of the hold is released).
        </P>
        <Tip variant="warning">
          Stripe holds expire after 7 days. If the rental is longer, the
          hold may need to be re-authorized when it&apos;s about to expire.
          The system alerts you 1 day before expiration.
        </Tip>
      </>
    ),
  },
  {
    slug: "refunds",
    title: "Issuing refunds",
    description: "Full and partial refunds via Stripe.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          From the reservation&apos;s Payments panel, find the original
          payment + click <strong>Refund</strong>.
        </P>
        <UL>
          <li>
            <strong>Full refund</strong> — refund the entire payment back to the card.
          </li>
          <li>
            <strong>Partial refund</strong> — specify a dollar amount or percentage. Useful for early returns, goodwill discounts, late-cancel adjustments.
          </li>
        </UL>
        <P>
          The refund is logged in the audit trail with reason + amount.
          Customer sees the refund on their card statement in 5-10 business
          days.
        </P>
      </>
    ),
  },
  {
    slug: "tolls-passthrough",
    title: "Tolls &amp; violations passthrough",
    description: "Charge customers for tolls or violations during their rental.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          When a toll or violation comes in for one of your vehicles,
          record it on <strong>Tolls &amp; Violations</strong>. The system
          auto-matches it to the reservation that had that car at that
          time.
        </P>
        <H2>Charging it to the customer</H2>
        <OL>
          <li>Click into the matched toll.</li>
          <li>
            Click <strong>Charge Customer</strong>. The system adds:
            <UL>
              <li>The original toll amount</li>
              <li>Your markup (configured in <strong>Settings → Toll Passthrough</strong>)</li>
            </UL>
          </li>
          <li>
            Total is charged to the customer&apos;s card on file + emailed to them with a breakdown.
          </li>
        </OL>
      </>
    ),
  },
];

// ---------- Category 6: Marketing ----------------------------------------

const marketing: AdminDoc[] = [
  {
    slug: "marketing-overview",
    title: "Marketing Campaigns overview",
    description: "How to send promotional emails to your customers.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          The Marketing section lets you blast a branded promotional email
          to your customers (or a segment of them), then track who opens
          it.
        </P>
        <H2>What you can do</H2>
        <UL>
          <li>Send one-off campaigns (e.g. Memorial Day promo)</li>
          <li>Schedule recurring campaigns (every 3 months, etc.)</li>
          <li>Target segments (all, VIP, active, lapsed)</li>
          <li>Attach a promo code that&apos;s highlighted in the email</li>
          <li>Track open rates per campaign + per recipient</li>
          <li>Resend to non-openers automatically</li>
        </UL>
        <H2>How to send your first campaign</H2>
        <OL>
          <li>
            Go to <strong>Marketing Campaigns → + New Campaign</strong>.
          </li>
          <li>Fill in name, audience, subject, body.</li>
          <li>Optionally attach a promo code.</li>
          <li>
            For recurring: set <strong>Send every N months</strong> in step 5.
          </li>
          <li>Click Send (or Schedule for recurring).</li>
        </OL>
      </>
    ),
  },
  {
    slug: "ai-holiday-suggestions",
    title: "AI holiday campaign suggestions",
    description: "One-click AI-generated campaigns for upcoming holidays.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          At the top of <strong>Marketing Campaigns</strong>, you&apos;ll
          see a panel showing upcoming US holidays (next 45 days). Each
          card has a <strong>Generate with AI</strong> button.
        </P>
        <H2>What it does</H2>
        <OL>
          <li>
            AI reads the holiday context (date, vibe, common angles), your
            company info, your fleet.
          </li>
          <li>
            Generates: campaign name, subject line, preheader, body, and a
            suggested promo code.
          </li>
          <li>
            Drops you on the composer with everything prefilled. Edit
            anything, then send.
          </li>
        </OL>
        <H2>Holidays covered</H2>
        <P>
          New Year&apos;s, Valentine&apos;s, Presidents&apos; Day, Spring
          Break, Memorial Day, Father&apos;s Day, July 4th, Labor Day,
          Halloween, Thanksgiving, Black Friday, Cyber Monday, Christmas,
          NYE.
        </P>
      </>
    ),
  },
  {
    slug: "birthday-automation",
    title: "Birthday automation",
    description: "Auto-send a personalized birthday discount to each customer.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          The cron runs daily and looks for customers whose birthday is
          approaching. Each gets a unique, single-use discount code minted
          just for them.
        </P>
        <H2>Configuring</H2>
        <P>
          Go to <strong>Settings → Birthday Campaign</strong>:
        </P>
        <UL>
          <li>Toggle on/off</li>
          <li>Lead time: send 1 day / 2 weeks / 1 month before</li>
          <li>Discount %</li>
          <li>Code prefix (default <Code>BDAY</Code>)</li>
          <li>Subject line + intro (supports <Code>{"{{first_name}}"}</Code> and <Code>{"{{discount_percent}}"}</Code> tokens)</li>
        </UL>
        <H2>How redemption works (secure)</H2>
        <P>
          Each recipient gets a unique code like <Code>BDAY-X7K9P3M2</Code>
          {" "}scoped to their account only. If they share it, no one else
          can use it. Single-use, 30-day expiration. The system creates
          the promo code automatically — you don&apos;t need to make it
          manually.
        </P>
      </>
    ),
  },
  {
    slug: "recurring-campaigns",
    title: "Recurring campaigns",
    description: "Schedule a campaign to send every X months on autopilot.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          Useful for: referral nudges every 3 months, win-back emails
          every 6 months, VIP exclusives every 2 months.
        </P>
        <H2>Setting up</H2>
        <OL>
          <li>
            Open the composer (<strong>+ New Campaign</strong>).
          </li>
          <li>Fill in name, audience, subject, body as usual.</li>
          <li>
            In Step 5 (Recurrence), set <strong>Send every N months</strong> to a number greater than 0.
          </li>
          <li>
            The Send button changes to <strong>Schedule Recurring Campaign</strong>.
          </li>
          <li>
            Click it. Nothing sends right now — the first fire happens in N months.
          </li>
        </OL>
        <H2>Managing</H2>
        <P>
          On the main Marketing page, recurring schedules appear in their
          own section at the top. Each row has a{" "}
          <strong>Pause / Resume</strong> button. Each automated fire
          creates a child campaign with its own stats — so you can see
          opens, clicks, and recipients per send.
        </P>
      </>
    ),
  },
  {
    slug: "customer-segments",
    title: "Customer segments",
    description: "Targeting the right audience for each campaign.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>Four built-in segments:</P>
        <UL>
          <li>
            <strong>All customers</strong> — every eligible customer (has email, not opted out, not blacklisted)
          </li>
          <li>
            <strong>VIP only</strong> — customers marked VIP on their profile
          </li>
          <li>
            <strong>Active (90 days)</strong> — booked within the last 90 days. Good for cross-sell, loyalty, &quot;rate this rental&quot; campaigns.
          </li>
          <li>
            <strong>Lapsed (90+ days)</strong> — haven&apos;t booked in 3+ months. Win-back territory — usually highest-ROI.
          </li>
        </UL>
        <Tip>
          If you don&apos;t see customers in a segment you expect, check
          their VIP / blacklisted / marketing-opted-out flags on the
          customer page.
        </Tip>
      </>
    ),
  },
];

// ---------- Category 7: AI Features --------------------------------------

const aiFeatures: AdminDoc[] = [
  {
    slug: "ai-receptionist",
    title: "AI Phone Receptionist",
    description: "How the AI answers calls and what it can do.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          When customers call your Twilio number, the AI assistant picks
          up, helps them, and either takes care of the inquiry, emails
          them a booking link, or transfers to your cell phone.
        </P>
        <H2>What it can do</H2>
        <UL>
          <li>Quote prices + availability from your live fleet</li>
          <li>Answer FAQ questions (hours, location, what&apos;s included)</li>
          <li>Email a booking link to the caller</li>
          <li>Transfer to your cell for complex issues</li>
        </UL>
        <H2>What it CAN&apos;T do (by design)</H2>
        <UL>
          <li>Take a payment over the phone</li>
          <li>Modify existing reservations (transfers to a human)</li>
          <li>Promise discounts that aren&apos;t in active offers</li>
        </UL>
        <H2>Voice options</H2>
        <P>
          Two voice modes available in <strong>Settings → AI Receptionist Voice</strong>:
        </P>
        <UL>
          <li>
            <strong>Polly</strong> — Twilio&apos;s built-in voices. Free, slight delay (~2 seconds between turns).
          </li>
          <li>
            <strong>Realtime</strong> — OpenAI&apos;s realtime voice (Coral, Marin, etc). Sounds nearly human, instant turn-taking. Requires the bridge service deployed to Render.
          </li>
        </UL>
        <H2>Reviewing calls</H2>
        <P>
          Every call lands on <strong>Phone Calls</strong> with full
          transcript, AI-generated summary, inferred intent, and per-call
          cost breakdown.
        </P>
      </>
    ),
  },
  {
    slug: "ai-document-checks",
    title: "AI document checks (License + Insurance)",
    description: "How the AI inspector works and what to trust.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          On any customer&apos;s detail page, the License Verification and
          Insurance Verification cards each have a{" "}
          <strong>Run AI Check</strong> button. The AI reads the uploaded
          photo and scores authenticity 0-100.
        </P>
        <H2>What it auto-extracts</H2>
        <P>For driver licenses:</P>
        <UL>
          <li>License #, state, expiration date, date of birth, full name</li>
        </UL>
        <P>For insurance:</P>
        <UL>
          <li>Insurance company, policy #, named insured, effective + expiration dates</li>
        </UL>
        <P>
          Extracted fields auto-fill empty fields on the customer record —
          never overwrite values you typed.
        </P>
        <H2>Risk levels returned</H2>
        <UL>
          <li>
            <strong>Low</strong> — looks legitimate, name matches, dates valid. Process normally.
          </li>
          <li>
            <strong>Medium</strong> — minor issues (low photo quality, expiring soon). Review the flags.
          </li>
          <li>
            <strong>High</strong> — name mismatch, low score, or suspicious. Verify manually before approving the rental.
          </li>
          <li>
            <strong>Block</strong> — expired, tampered, or not an insurance doc at all. Do NOT rent.
          </li>
        </UL>
        <Tip>
          The AI only reads photos, not PDFs. If the customer uploads a
          PDF, ask them to take a photo of the document instead.
        </Tip>
      </>
    ),
  },
  {
    slug: "ai-chat",
    title: "AI Chat (website)",
    description: "The chat widget on your customer website.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          Bottom-right chat bubble on every page of the customer website.
          The AI knows your fleet, prices, policies, and can guide
          visitors to the right vehicle + send them to checkout.
        </P>
        <H2>Conversation flow</H2>
        <UL>
          <li>Visitor asks a question (price, availability, recommendations)</li>
          <li>AI answers using your live data (won&apos;t make up cars or prices)</li>
          <li>For things it can&apos;t handle: refers visitor to your contact info or the team</li>
        </UL>
        <H2>What it knows about</H2>
        <UL>
          <li>Every vehicle in your fleet + current rates + status</li>
          <li>Your company info (hours, location, contact)</li>
          <li>How rentals work, what&apos;s required, insurance policy</li>
        </UL>
      </>
    ),
  },
];

// ---------- Category 8: Settings -----------------------------------------

const settings: AdminDoc[] = [
  {
    slug: "settings-overview",
    title: "Settings page overview",
    description: "Every editable setting and what it controls.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <P>
          The Settings page has ~15 cards, grouped by purpose. Everything
          here propagates immediately — no deploy needed.
        </P>
        <H2>General</H2>
        <UL>
          <li>
            <strong>Company Profile</strong> — name, address, phone, email, logo. Shown on the website, emails, and PDFs.
          </li>
          <li>
            <strong>Tax</strong> — sales tax rate. Used on every booking, every quote.
          </li>
          <li>
            <strong>Booking Rules</strong> — min/max rental days, min driver age, buffer hours between bookings.
          </li>
        </UL>
        <H2>AI</H2>
        <UL>
          <li>
            <strong>AI Receptionist Voice</strong> — Polly or Realtime mode + voice picker (test with Preview button)
          </li>
        </UL>
        <H2>Operations</H2>
        <UL>
          <li>
            <strong>Business Hours</strong> — per-day open/close. Used by the AI receptionist and contact page.
          </li>
          <li>
            <strong>Cancellation Policy</strong> — free-cancellation window + late-cancel fee %
          </li>
          <li>
            <strong>Driver Requirements</strong> — min years licensed, international license accepted, young driver surcharge
          </li>
          <li>
            <strong>Late Return Policy</strong> — grace minutes + hourly overtime rate
          </li>
          <li>
            <strong>Fuel Policy</strong> — refuel fee + per-gallon markup
          </li>
          <li>
            <strong>Pickup &amp; Delivery</strong> — in-house / local / airport options + fees
          </li>
          <li>
            <strong>Verification Levels</strong> — which checks (AI / DMV / Stripe) are required before check-out
          </li>
          <li>
            <strong>Toll Passthrough Markup</strong> — fee added to each toll charged to customers
          </li>
        </UL>
        <H2>Notifications</H2>
        <UL>
          <li>
            <strong>Auto-Email Preferences</strong> — 9 automated emails, each with their own timing or off (0 = off)
          </li>
          <li>
            <strong>Owner Notifications</strong> — which events email YOU
          </li>
          <li>
            <strong>Birthday Campaign</strong> — auto-send personalized birthday discount codes
          </li>
        </UL>
        <H2>Display &amp; Marketing</H2>
        <UL>
          <li>
            <strong>Social Media Links</strong> — rendered as footer icons. Empty fields hide that network.
          </li>
          <li>
            <strong>Display Timezone</strong> — controls how dates show in admin (default UTC, switch to America/Los_Angeles for Pacific time).
          </li>
        </UL>
        <H2>Catalog &amp; Agreement</H2>
        <UL>
          <li>
            <strong>Add-ons</strong> — optional extras customers can pick at checkout (e.g. child seat, GPS unit)
          </li>
          <li>
            <strong>Fees</strong> — required fees added to every booking (cleaning, location, etc.)
          </li>
          <li>
            <strong>Rental Agreement</strong> — the contract template
          </li>
        </UL>
      </>
    ),
  },
];

// ---------- Category 9: Troubleshooting ----------------------------------

const troubleshooting: AdminDoc[] = [
  {
    slug: "common-issues",
    title: "Common issues + fixes",
    description: "Quick lookup for problems you might run into.",
    updatedAt: "2026-05-25",
    content: (
      <>
        <H2>&quot;Customer can&apos;t book — site says they have to sign in&quot;</H2>
        <P>
          Working as designed. Bookings require sign-in so we have a
          verified email + can reach them after pickup. They&apos;ll be
          redirected to register, then back to the booking they were
          trying to complete.
        </P>

        <H2>&quot;Email not sending&quot;</H2>
        <P>
          Check <strong>Settings</strong> page — if you see a warning
          banner about email, the SMTP / Resend credentials are missing.
          Vercel env vars: <Code>RESEND_API_KEY</Code> or{" "}
          <Code>SMTP_HOST</Code>+<Code>SMTP_USER</Code>+<Code>SMTP_PASS</Code>.
        </P>

        <H2>&quot;AI receptionist not picking up&quot;</H2>
        <P>
          Check the <strong>Phone Calls</strong> page — if calls show
          &quot;failed&quot; status, the Twilio webhook URL is wrong.
          Make sure your Twilio phone number&apos;s Voice URL points to:
        </P>
        <P>
          <Code>https://www.carmartrentals.com/api/twilio/voice</Code>
        </P>

        <H2>&quot;Pre-check-in email link gives a 404&quot;</H2>
        <P>
          Fixed. Customers without an account are now redirected to sign
          in, then sent back to the pre-check-in page.
        </P>

        <H2>&quot;Tax shows different number on customer vs admin&quot;</H2>
        <P>
          Fixed. Both sides now read live from Settings → Tax. If you
          changed it recently, do a hard refresh (Ctrl+Shift+R) to clear
          the cache.
        </P>

        <H2>&quot;Promo code says &apos;not valid for this account&apos;&quot;</H2>
        <P>
          The code is customer-scoped (birthday code, goodwill credit,
          etc.). Only the customer it was minted for can use it. If you
          want a code anyone can use, create a new one without the
          customer scope from <strong>Promo Codes</strong>.
        </P>

        <H2>&quot;Duplicate customers piling up&quot;</H2>
        <P>
          Fixed. Migration 0027 added DB-level constraints + the booking
          flow now handles existing customer lookup correctly.
        </P>
      </>
    ),
  },
];

// ---------- Final export -------------------------------------------------

export const ADMIN_DOC_CATEGORIES: AdminDocCategory[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Onboarding for new staff. Read these first.",
    icon: BookOpen,
    topics: gettingStarted,
  },
  {
    slug: "reservations",
    title: "Reservations",
    description: "Creating, editing, and managing bookings.",
    icon: ClipboardList,
    topics: reservations,
  },
  {
    slug: "check-in-out",
    title: "Check-in / Check-out",
    description: "Picking up + returning vehicles.",
    icon: ClipboardCheck,
    topics: checkInOut,
  },
  {
    slug: "customers",
    title: "Customers",
    description: "Verifying docs, VIP status, blacklisting.",
    icon: Users,
    topics: customers,
  },
  {
    slug: "financials",
    title: "Financials",
    description: "Payments, deposits, refunds, tolls.",
    icon: CreditCard,
    topics: financials,
  },
  {
    slug: "marketing",
    title: "Marketing",
    description: "Campaigns, segments, automation.",
    icon: Megaphone,
    topics: marketing,
  },
  {
    slug: "ai-features",
    title: "AI Features",
    description: "Receptionist, doc checks, chat, damage detection.",
    icon: Sparkles,
    topics: aiFeatures,
  },
  {
    slug: "settings",
    title: "Settings",
    description: "What every setting controls.",
    icon: SettingsIcon,
    topics: settings,
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Common issues + how to fix them.",
    icon: AlertCircle,
    topics: troubleshooting,
  },
];

// Vehicle/fleet category — referenced by the index but lives at the
// bottom to keep the category list short. Add docs here as we expand.
ADMIN_DOC_CATEGORIES.splice(4, 0, {
  slug: "fleet",
  title: "Fleet",
  description: "Adding vehicles, pricing, maintenance, documents.",
  icon: Car,
  topics: [
    {
      slug: "fleet-coming-soon",
      title: "Fleet docs (coming soon)",
      description: "Documentation for fleet management is being written.",
      updatedAt: "2026-05-25",
      content: (
        <>
          <P>
            Detailed fleet documentation will land here next. For now,
            the Vehicles section in the sidebar is pretty
            self-explanatory: click + New Vehicle, fill in the form, upload
            photos. Reach out if you have specific questions and we&apos;ll
            add them to this doc.
          </P>
        </>
      ),
    },
  ],
});

/** Find a doc by category + slug. Returns null if not found. */
export function findAdminDoc(
  categorySlug: string,
  topicSlug: string,
): { category: AdminDocCategory; doc: AdminDoc } | null {
  const category = ADMIN_DOC_CATEGORIES.find((c) => c.slug === categorySlug);
  if (!category) return null;
  const doc = category.topics.find((t) => t.slug === topicSlug);
  if (!doc) return null;
  return { category, doc };
}

/** Flat list of every doc — for the search filter on the index. */
export function getAllAdminDocs(): Array<
  AdminDoc & { categorySlug: string; categoryTitle: string }
> {
  return ADMIN_DOC_CATEGORIES.flatMap((c) =>
    c.topics.map((t) => ({
      ...t,
      categorySlug: c.slug,
      categoryTitle: c.title,
    })),
  );
}
