import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo className="h-16 w-auto" priority />
          <p className="mt-4 text-sm text-slate-400">
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
