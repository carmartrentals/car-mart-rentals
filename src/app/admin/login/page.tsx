import type { Metadata } from "next";
import { Suspense } from "react";
import { Car } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500">
            <Car className="h-6 w-6 text-brand-950" />
          </span>
          <h1 className="heading-display mt-4 text-2xl font-bold text-white">
            Car Mart Rentals
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Management System — Staff Sign In
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-elevated">
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized personnel only. All activity is logged.
        </p>
      </div>
    </div>
  );
}
