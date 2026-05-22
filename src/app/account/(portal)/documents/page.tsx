import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, ShieldAlert, Clock, ScanLine, Zap, IdCard,
} from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { stripeConfigured } from "@/lib/stripe";
import { aiConfigured } from "@/lib/ai";
import { DocumentUpload } from "@/components/account/document-upload";
import {
  IdentityVerifyButton,
  LicenseDetailsForm,
  InsuranceDetailsForm,
} from "@/components/account/document-verification";
import { DOCUMENT_STATUS_LABEL, isExpired } from "@/lib/documents";
import type { DocumentStatus } from "@/lib/types/database";

export default async function AccountDocumentsPage() {
  const customer = await getCurrentCustomer();
  const dlStatus: DocumentStatus = customer?.dl_status ?? "not_submitted";
  const insStatus: DocumentStatus = customer?.insurance_status ?? "not_submitted";
  const instant = stripeConfigured();
  const aiEnabled = aiConfigured();

  return (
    <>
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Account
      </Link>

      <h1 className="heading-display text-2xl font-bold text-white">
        My Documents
      </h1>
      <p className="mt-0.5 text-sm text-slate-400">
        Verify your driver license and insurance so we can hand over the keys
        without delay at pickup.
      </p>

      {/* Overview */}
      <div className="mt-5">
        {dlStatus === "verified" && insStatus === "verified" ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Everything is verified —
            you&apos;re all set for pickup.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
            <Clock className="h-4 w-4 shrink-0" /> Complete the steps below. Most
            reviews are finished within one business day.
          </div>
        )}
      </div>

      {/* Driver License */}
      <DocCard
        icon={IdCard}
        title="Driver License"
        status={dlStatus}
        rejectionReason={customer?.dl_rejection_reason ?? null}
        expired={isExpired(customer?.dl_expiration)}
        expiredLabel="Your license on file has expired — please add a current one."
      >
        {instant && dlStatus !== "verified" && (
          <div className="rounded-xl border border-gold-400/30 bg-gold-400/[0.07] p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gold-300">
              <Zap className="h-4 w-4" /> Fastest — instant ID check
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Scan your license and take a quick selfie with your phone. Most
              checks are approved in under two minutes.
            </p>
            <div className="mt-3">
              <IdentityVerifyButton />
            </div>
          </div>
        )}

        {instant && dlStatus !== "verified" && (
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-600">
            <span className="h-px flex-1 bg-white/10" /> or upload photos
            <span className="h-px flex-1 bg-white/10" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <DocumentUpload
            kind="dl_front"
            label="Driver License — Front"
            hint="The side with your photo"
            url={customer?.dl_front_url ?? null}
          />
          <DocumentUpload
            kind="dl_back"
            label="Driver License — Back"
            hint="The reverse side"
            url={customer?.dl_back_url ?? null}
          />
        </div>

        <LicenseDetailsForm
          aiEnabled={aiEnabled}
          initial={{
            dl_number: customer?.dl_number ?? "",
            dl_state: customer?.dl_state ?? "",
            dl_expiration: customer?.dl_expiration ?? "",
          }}
        />
      </DocCard>

      {/* Insurance */}
      <DocCard
        icon={ShieldCheck}
        title="Proof of Insurance"
        status={insStatus}
        rejectionReason={customer?.insurance_rejection_reason ?? null}
        expired={isExpired(customer?.insurance_expiration)}
        expiredLabel="Your insurance on file has expired — please add a current one."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <DocumentUpload
            kind="insurance"
            label="Proof of Insurance"
            hint="Insurance card or declaration page"
            url={customer?.insurance_doc_url ?? null}
          />
          <div className="hidden sm:block" />
        </div>

        <InsuranceDetailsForm
          aiEnabled={aiEnabled}
          initial={{
            insurance_company: customer?.insurance_company ?? "",
            insurance_policy_no: customer?.insurance_policy_no ?? "",
            insurance_expiration: customer?.insurance_expiration ?? "",
          }}
        />
      </DocCard>

      <p className="mt-5 text-xs text-slate-500">
        Your documents are stored securely and used only to verify your rental.
      </p>
    </>
  );
}

function DocCard({
  icon: Icon,
  title,
  status,
  rejectionReason,
  expired,
  expiredLabel,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  expired: boolean;
  expiredLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass mt-6 overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-gold-300" /> {title}
        </h2>
        <StatusPill status={status} />
      </div>
      <div className="space-y-4 p-5">
        {status === "verified" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Verified — no action
            needed. You can replace it below if anything changes.
          </div>
        )}
        {status === "pending" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <Clock className="h-3.5 w-3.5 shrink-0" /> Submitted — our team is
            reviewing it.
          </div>
        )}
        {status === "rejected" && rejectionReason && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Action needed:</strong> {rejectionReason}
            </span>
          </div>
        )}
        {expired && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{expiredLabel}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DocumentStatus }) {
  const styles: Record<DocumentStatus, string> = {
    not_submitted: "border-white/15 bg-white/5 text-slate-400",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    verified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    rejected: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  };
  const Icon = status === "verified" ? ShieldCheck : status === "rejected" ? ShieldAlert : status === "pending" ? Clock : ScanLine;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon className="h-3 w-3" /> {DOCUMENT_STATUS_LABEL[status]}
    </span>
  );
}
