import * as Sentry from "@sentry/nextjs";

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://6fb7e6a99d1c604ebf409588487d71ac@o4511435304796160.ingest.us.sentry.io/4511435311677440";

/** Server / edge error monitoring — runs once when the server starts. */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
    });
  }
}

// Reports errors thrown in Server Components, route handlers and actions.
export const onRequestError = Sentry.captureRequestError;
