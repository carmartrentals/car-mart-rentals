"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cmr-cookie-consent";

/** Lightweight cookie / privacy consent banner (CCPA-friendly notice). */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      /* localStorage unavailable — skip the banner */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-brand-900/95 backdrop-blur">
      <div className="container-px flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm text-slate-300">
          We use cookies to run this site and improve your experience. We do
          not sell your personal information. See our{" "}
          <Link
            href="/privacy"
            className="font-medium text-gold-300 underline underline-offset-2 hover:text-gold-200"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-gold-500 px-5 py-2 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
