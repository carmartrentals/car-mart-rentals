import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gift, Share2, Users } from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralCode, REFERRAL_REWARD_TEXT } from "@/lib/referral";
import { SITE_URL } from "@/lib/constants";
import { CopyButton } from "@/components/account/copy-button";

export default async function ReferPage() {
  const customer = await getCurrentCustomer();
  if (!customer) notFound();

  const admin = createAdminClient();
  const code = await getOrCreateReferralCode(admin, customer.id);
  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", customer.id);
  const referralCount = count ?? 0;
  const shareUrl = `${SITE_URL}/vehicles?ref=${code}`;

  const steps = [
    {
      icon: Share2,
      title: "Share your code",
      body: "Send your referral code or link to friends and family.",
    },
    {
      icon: Users,
      title: "They book a rental",
      body: `Your friend enters your code when they make their first booking.`,
    },
    {
      icon: Gift,
      title: "You both get rewarded",
      body: `Once their first rental is complete, you each receive ${REFERRAL_REWARD_TEXT}.`,
    },
  ];

  return (
    <>
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Account
      </Link>

      <h1 className="heading-display text-2xl font-bold text-white">
        Refer a Friend
      </h1>
      <p className="mt-0.5 text-sm text-slate-400">
        Give friends {REFERRAL_REWARD_TEXT} their first rental — and earn{" "}
        {REFERRAL_REWARD_TEXT} yourself when they book.
      </p>

      {/* Referral code */}
      <div className="glass mt-6 rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your Referral Code
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="heading-display rounded-lg border border-gold-400/30 bg-gold-400/[0.07] px-4 py-2 text-2xl font-bold tracking-[0.2em] text-gold-300">
            {code}
          </span>
          <CopyButton value={code} label="Copy code" />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your Share Link
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-brand-900 px-3 py-2 text-sm text-slate-300">
            {shareUrl}
          </span>
          <CopyButton value={shareUrl} label="Copy link" />
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
              <s.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-semibold text-white">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      {/* Stat */}
      <div className="glass mt-6 flex items-center gap-3 rounded-2xl p-5">
        <Users className="h-5 w-5 text-gold-300" />
        <p className="text-sm text-slate-300">
          You&apos;ve referred{" "}
          <span className="font-bold text-white">{referralCount}</span>{" "}
          {referralCount === 1 ? "friend" : "friends"} so far.
        </p>
      </div>

      <p className="mt-5 text-xs text-slate-500">
        Rewards are applied by our team once the referred rental is complete.
      </p>
    </>
  );
}
