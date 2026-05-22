import * as Sentry from "@sentry/nextjs";

/** Browser-side error monitoring. */
Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://6fb7e6a99d1c604ebf409588487d71ac@o4511435304796160.ingest.us.sentry.io/4511435311677440",
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
