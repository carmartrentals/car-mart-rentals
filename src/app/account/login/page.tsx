import type { Metadata } from "next";
import Link from "next/link";
import { Car } from "lucide-react";
import { AccountAuth } from "@/components/account/account-auth";

export const metadata: Metadata = { title: "Customer Sign In" };

export default function AccountLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500">
            <Car className="h-6 w-6 text-brand-950" />
          </span>
          <span className="heading-display mt-3 text-xl font-bold text-slate-900">
            Car Mart Rentals
          </span>
          <span className="text-sm text-slate-500">Customer Portal</span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h1 className="mb-5 text-lg font-semibold text-slate-900">
            Sign In to Your Account
          </h1>
          <AccountAuth mode="login" />
        </div>
      </div>
    </div>
  );
}
