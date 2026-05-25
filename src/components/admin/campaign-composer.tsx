"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Mail,
  Tag,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Crown,
  Activity,
  Moon,
  Gift,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { createAndSendCampaign } from "@/app/admin/(panel)/marketing/actions";
import type { PromoCode, MarketingAudience } from "@/lib/types/database";

// The 4 audience options shown in the composer's segment picker.
const AUDIENCE_OPTIONS: Array<{
  value: MarketingAudience;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "all",
    label: "All customers",
    description: "Every eligible customer.",
    icon: Users,
  },
  {
    value: "vip",
    label: "VIP only",
    description: "Customers marked as VIP on their profile.",
    icon: Crown,
  },
  {
    value: "active_90d",
    label: "Active (90 days)",
    description: "Booked within the last 90 days — loyalty / cross-sell.",
    icon: Activity,
  },
  {
    value: "lapsed_90d",
    label: "Lapsed (90+ days)",
    description: "Haven't booked in 90+ days — win-back territory.",
    icon: Moon,
  },
];

const REFERRAL_TEMPLATE = {
  subject: "Give $25, get $25 — share your referral code",
  preheader: "Your personal code is inside. One use per friend.",
  body: `Loved your last rental? Share the keys with a friend.

Your personal referral code is {{referral_code}} — your friend gets $25 off their first booking, and you get a $25 credit on your next rental when they redeem it. No limits, use it as often as you like.

Just send them your code or have them paste it at checkout.`,
};

export function CampaignComposer({
  promos,
  eligibleCount,
  initial,
}: {
  promos: PromoCode[];
  eligibleCount: number;
  initial?: {
    name?: string;
    subject?: string;
    preheader?: string;
    body?: string;
    promo_code_id?: string;
    audience?: MarketingAudience;
    resend_of_campaign_id?: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [preheader, setPreheader] = useState(initial?.preheader ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState("Browse the Fleet");
  const [ctaUrl, setCtaUrl] = useState("https://www.carmartrentals.com/vehicles");
  const [promoId, setPromoId] = useState<string>(initial?.promo_code_id ?? "");
  const [audience, setAudience] = useState<MarketingAudience>(
    initial?.audience ?? "all",
  );
  const resendOfCampaignId = initial?.resend_of_campaign_id ?? null;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ sent: number; failed: number } | null>(
    null,
  );

  const selectedPromo = promos.find((p) => p.id === promoId);

  function send() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createAndSendCampaign({
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim(),
        body: body.trim(),
        cta_label: ctaLabel.trim(),
        cta_url: ctaUrl.trim(),
        promo_code_id: promoId || null,
        audience,
        resend_of_campaign_id: resendOfCampaignId,
      });
      if (res.ok) {
        const data = (res as { data?: { sent: number; failed: number } }).data;
        setSuccess({ sent: data?.sent ?? 0, failed: data?.failed ?? 0 });
        setConfirming(false);
        // Redirect to the campaign list after a short pause so the operator
        // sees the result confirmation.
        setTimeout(() => router.push("/admin/marketing"), 2500);
      } else {
        setError(res.error ?? "Could not send the campaign.");
        setConfirming(false);
      }
    });
  }

  const canSend =
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    eligibleCount > 0;

  if (success) {
    return (
      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Campaign sent!
            </h2>
            <p className="text-sm text-slate-600">
              Delivered to{" "}
              <strong className="text-slate-900">{success.sent}</strong>{" "}
              recipient(s).
              {success.failed > 0 && (
                <>
                  {" "}
                  <span className="text-amber-700">
                    {success.failed} failed
                  </span>{" "}
                  — check the campaign detail page.
                </>
              )}
            </p>
            <p className="text-xs text-slate-400">
              Redirecting to the campaign list...
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>1 · Internal name</CardTitle>
          </CardHeader>
          <CardBody>
            <Field
              label="Campaign name"
              hint="Just for you — never shown to customers. e.g. 'Memorial Day 20% off'"
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Memorial Day Sale 2026"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2 · Audience</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-xs text-slate-500">
              Pick who gets this email. Segments are evaluated when you hit
              Send — final count appears in the sidebar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const selected = audience === opt.value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      selected
                        ? "border-gold-500 bg-gold-50/60 ring-2 ring-gold-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        selected
                          ? "bg-gold-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <OptIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          selected ? "text-gold-900" : "text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3 · Email content</CardTitle>
            <button
              type="button"
              onClick={() => {
                setSubject(REFERRAL_TEMPLATE.subject);
                setPreheader(REFERRAL_TEMPLATE.preheader);
                setBody(REFERRAL_TEMPLATE.body);
                if (!name.trim()) setName("Referral Program Nudge");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title="Load a pre-written referral email template"
            >
              <Gift className="h-3.5 w-3.5 text-gold-600" />
              Use Referral Template
            </button>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Subject line"
              hint="What recipients see in their inbox. Keep under ~50 characters."
            >
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Memorial Day weekend — 20% off any luxury rental"
              />
            </Field>
            <Field
              label="Preheader (preview text)"
              hint="Optional — shows next to the subject in the inbox. ~80 characters max."
            >
              <Input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Book by Monday and save on your next trip."
              />
            </Field>
            <Field
              label="Body"
              hint="Plain text — blank lines become paragraph breaks. Tone, length, and personality up to you."
            >
              <Textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Hi {{first_name}},

It's Memorial Day weekend, and we want to make your getaway feel even better. Through Monday, take 20% off any luxury rental in our fleet.

Whether it's a road trip in our Mercedes-AMG GLE 53, or a smooth ride to the airport in our S-Class, we've got you covered.

Use code MEMORIAL20 at checkout. See you on the road!`}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Tip: the greeting line (<em>Hi [first name],</em>) is
                added automatically. You can also drop{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">
                  {"{{referral_code}}"}
                </code>{" "}
                anywhere in the body — it gets replaced with each
                recipient&apos;s personal referral code at send time.
              </p>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4 · Call-to-action button</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Button label"
              hint="Leave blank to skip the button entirely."
            >
              <Input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Browse the Fleet"
              />
            </Field>
            <Field label="Button URL">
              <Input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://www.carmartrentals.com/vehicles"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5 · Promo code (optional)</CardTitle>
          </CardHeader>
          <CardBody>
            {promos.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mr-1 inline h-4 w-4" />
                No active promo codes.{" "}
                <a
                  href="/admin/promo-codes"
                  className="font-medium underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create one
                  <ExternalLink className="ml-0.5 inline h-3 w-3" />
                </a>{" "}
                first if you want to feature one.
              </div>
            ) : (
              <Field
                label="Attach a promo code"
                hint="Featured in a big dashed-border box above the CTA so customers can't miss it."
              >
                <Select
                  value={promoId}
                  onChange={(e) => setPromoId(e.target.value)}
                >
                  <option value="">No promo code</option>
                  {promos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} —{" "}
                      {p.discount_type === "percentage"
                        ? `${p.discount_value}% off`
                        : `$${p.discount_value} off`}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </CardBody>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}
      </div>

      {/* Sidebar */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-gold-600" />
                Send Summary
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <SummaryRow
              icon={Users}
              label="Audience"
              value={
                AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label ??
                "All customers"
              }
            />
            <SummaryRow
              icon={Mail}
              label="Eligible total"
              value={`${eligibleCount} customer${eligibleCount === 1 ? "" : "s"}`}
            />
            <SummaryRow
              icon={Mail}
              label="Subject"
              value={subject || "—"}
            />
            <SummaryRow
              icon={Tag}
              label="Promo"
              value={selectedPromo ? selectedPromo.code : "None"}
            />

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Heads up:</strong> sending is immediate. There&apos;s
              no scheduled-send yet. Double-check the subject and body before
              you click Send.
            </div>

            {!confirming ? (
              <Button
                className="w-full"
                onClick={() => setConfirming(true)}
                disabled={!canSend || pending}
              >
                <Send className="h-4 w-4" /> Send Campaign
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm font-medium text-slate-700">
                  Send this campaign to your selected audience — are you sure?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={send}
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {pending ? "Sending..." : "Yes, send now"}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
