"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Mounts once and listens for clicks on any element with a `data-ga` attribute.
 * Lets server components participate in event tracking without becoming
 * client components — just add data-ga="event_name" and optional
 * data-ga-* attributes which are forwarded as event parameters.
 *
 * Usage:
 *   <a href="..." data-ga="phone_click" data-ga-source="home_hero">Call</a>
 */
export function AnalyticsClicks() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-ga]");
      if (!el) return;
      const name = el.dataset.ga;
      if (!name) return;
      // Collect every data-ga-* attribute except data-ga itself as params.
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.dataset)) {
        if (key === "ga" || value === undefined) continue;
        if (key.startsWith("ga")) {
          // data-ga-source → "source"
          const paramKey = key.slice(2).replace(/^[A-Z]/, (c) =>
            c.toLowerCase(),
          );
          params[paramKey] = value;
        }
      }
      trackEvent(name, params);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
