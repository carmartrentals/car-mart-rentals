"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Top-level error boundary — reports the crash to Sentry and shows a fallback. */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c11",
          color: "#e2e8f0",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
            We&apos;ve been notified and are looking into it. Please try again.
          </p>
          <a
            href="/"
            style={{
              background: "#d4af37",
              color: "#0b0c11",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Back to Home
          </a>
        </div>
      </body>
    </html>
  );
}
