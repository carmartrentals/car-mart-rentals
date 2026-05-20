"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountAuth({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, account_type: "customer" },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        if (data.session) {
          router.push("/account");
          router.refresh();
        } else {
          setConfirm(true);
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        router.push("/account");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Check your email
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          We sent a confirmation link to <strong>{email}</strong>. Confirm your
          email, then sign in.
        </p>
        <Link
          href="/account/login"
          className="mt-5 inline-block rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 hover:bg-gold-400"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {isRegister && (
        <Field icon={User} label="Full Name">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="auth-input"
          />
        </Field>
      )}

      <Field icon={Mail} label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="auth-input"
        />
      </Field>

      <Field icon={Lock} label="Password">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="auth-input"
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-sm font-semibold text-brand-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isRegister ? "Create Account" : "Sign In"}
      </button>

      <p className="text-center text-sm text-slate-500">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/account/login" className="font-medium text-gold-700 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New customer?{" "}
            <Link href="/account/register" className="font-medium text-gold-700 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      <style>{`
        .auth-input {
          width: 100%;
          height: 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0 0.75rem 0 2.5rem;
          font-size: 0.875rem;
        }
        .auth-input:focus {
          outline: none;
          border-color: #c8a45c;
          box-shadow: 0 0 0 2px rgba(200,164,92,0.3);
        }
      `}</style>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
