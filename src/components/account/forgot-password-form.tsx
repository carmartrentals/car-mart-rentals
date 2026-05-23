"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Customer "forgot password" flow — sends a Supabase recovery email. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h2 className="mt-3 text-lg font-semibold text-white">Check your email</h2>
        <p className="mt-1 text-sm text-slate-400">
          If an account exists for{" "}
          <strong className="text-slate-200">{email}</strong>, we&apos;ve sent a
          password reset link. The link expires in one hour.
        </p>
        <Link
          href="/account/login"
          className="mt-5 inline-block rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-400">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="auth-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Send Reset Link
      </button>

      <p className="text-center text-sm text-slate-400">
        Remembered it?{" "}
        <Link
          href="/account/login"
          className="font-medium text-gold-300 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <style>{`
        .auth-input {
          width: 100%;
          height: 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 12, 17, 0.6);
          padding: 0 0.75rem 0 2.5rem;
          font-size: 0.875rem;
          color: #ffffff;
          color-scheme: dark;
        }
        .auth-input::placeholder { color: #64748b; }
        .auth-input:focus {
          outline: none;
          border-color: #cbced4;
          box-shadow: 0 0 0 2px rgba(203, 206, 212, 0.25);
        }
      `}</style>
    </form>
  );
}
