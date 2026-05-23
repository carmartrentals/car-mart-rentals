import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Set New Password" };

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-950 px-4 py-12">
      <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-72" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-7 flex flex-col items-center">
          <BrandLogo className="h-14 w-auto" priority />
          <span className="mt-2 text-sm text-slate-400">Customer Portal</span>
        </Link>
        <div className="glass rounded-2xl p-6">
          <h1 className="mb-5 text-lg font-semibold text-white">
            Set a New Password
          </h1>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
