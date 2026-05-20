import type { Metadata } from "next";
import Link from "next/link";
import { AccountAuth } from "@/components/account/account-auth";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Create Customer Account" };

export default function AccountRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex flex-col items-center">
          <BrandLogo className="h-14 w-auto" priority />
          <span className="mt-2 text-sm text-slate-500">Customer Portal</span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h1 className="mb-5 text-lg font-semibold text-slate-900">
            Create Your Account
          </h1>
          <AccountAuth mode="register" />
        </div>
      </div>
    </div>
  );
}
