import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireCustomer } from "@/lib/account";
import { DocumentUpload } from "@/components/account/document-upload";
import { OnboardingForm } from "@/components/account/onboarding-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const customer = await requireCustomer();
  const sp = await searchParams;
  const redirectParam = Array.isArray(sp.redirect) ? sp.redirect[0] : sp.redirect;
  // Don't allow open redirects — only follow same-origin internal paths.
  const nextUrl =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/account";

  // If they already have a license on file, skip onboarding entirely.
  if (customer.dl_front_url) redirect(nextUrl);

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-300">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Welcome to Car Mart Rentals</p>
            <h1 className="heading-display mt-1 text-3xl font-bold text-white">
              One quick step before you book
            </h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-slate-400">
              Upload a photo of your driver license now and we&apos;ll have you
              verified before pickup day — no waiting at the lot. Takes about
              60 seconds.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <DocumentUpload
            kind="dl_front"
            label="Driver License — Front"
            hint="Clear, well-lit, no glare. Photo or PDF."
            url={customer.dl_front_url}
          />
          <DocumentUpload
            kind="dl_back"
            label="Driver License — Back"
            hint="Required by most states. Same rules — clear & well-lit."
            url={customer.dl_back_url}
          />
        </div>

        <OnboardingForm
          initial={{
            phone: customer.phone ?? "",
            date_of_birth: customer.date_of_birth ?? "",
            dl_number: customer.dl_number ?? "",
            dl_state: customer.dl_state ?? "",
            dl_expiration: customer.dl_expiration ?? "",
          }}
          hasFront={Boolean(customer.dl_front_url)}
          hasBack={Boolean(customer.dl_back_url)}
          nextUrl={nextUrl}
        />

        <p className="mt-6 text-center text-xs text-slate-500">
          Your documents are private and only used to verify your rental. We
          never share or sell them.
        </p>
      </div>
    </>
  );
}
