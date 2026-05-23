"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Customer "set a new password" form — used after clicking the email link. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Supabase puts the recovery session in the URL hash. Confirm we have one.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/account");
        router.refresh();
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h2 className="mt-3 text-lg font-semibold text-white">
          Password Updated
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Redirecting you to your account…
        </p>
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-400">
          This reset link has expired or is invalid. Please request a new one.
        </p>
        <Link
          href="/account/forgot-password"
          className="mt-5 inline-block rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
        >
          Request a New Link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-400">Choose a new password for your account.</p>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="auth-input"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="auth-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || hasSession === null}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-sm font-semibold text-brand-950 transition-colors hover:bg-white disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Update Password
      </button>

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
