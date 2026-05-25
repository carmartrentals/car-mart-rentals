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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { createAndSendCampaign } from "@/app/admin/(panel)/marketing/actions";
import type { PromoCode } from "@/lib/types/database";

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
            <CardTitle>2 · Email content</CardTitle>
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
                Tip: don&apos;t literally type {"{{first_name}}"} — the system
                inserts the customer&apos;s first name automatically in the
                greeting line at the top of the email.
              </p>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3 · Call-to-action button</CardTitle>
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
            <CardTitle>4 · Promo code (optional)</CardTitle>
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
              label="Recipients"
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
                <Send className="h-4 w-4" /> Send to {eligibleCount} Customers
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm font-medium text-slate-700">
                  Send to {eligibleCount} customers — are you sure?
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
