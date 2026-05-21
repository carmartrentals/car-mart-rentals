import Link from "next/link";
import { ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import { getCurrentCustomer } from "@/lib/account";
import { DocumentUpload } from "@/components/account/document-upload";

export default async function AccountDocumentsPage() {
  const customer = await getCurrentCustomer();

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
        Upload your driver license and insurance so we can verify you before
        pickup. Clear photos taken with your phone work best.
      </p>

      <div className="mt-5">
        {customer?.documents_verified ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Your documents have been
            verified — you&apos;re all set.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
            <Clock className="h-4 w-4 shrink-0" /> Upload your documents below.
            Our team reviews them within one business day.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
        <DocumentUpload
          kind="insurance"
          label="Proof of Insurance"
          hint="Insurance card or declaration page"
          url={customer?.insurance_doc_url ?? null}
        />
      </div>

      <p className="mt-5 text-xs text-slate-500">
        Your documents are stored securely and used only to verify your rental.
      </p>
    </>
  );
}
