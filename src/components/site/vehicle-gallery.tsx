"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleImage } from "@/lib/types/database";

// Local placeholder served from /public — branded and instant, no external CDN.
const FALLBACK = "/fleet-placeholder.jpg";

export function VehicleGallery({
  images,
  mainImageUrl,
  name,
}: {
  images: VehicleImage[];
  mainImageUrl?: string | null;
  name: string;
}) {
  const sorted = [...images].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      a.sort_order - b.sort_order,
  );
  // Prefer the vehicle_images gallery; fall back to the main image; finally a
  // stock placeholder. This guarantees customers never see a generic Porsche
  // shot in place of the actual car.
  const urls = sorted.length
    ? sorted.map((i) => i.url)
    : mainImageUrl
      ? [mainImageUrl]
      : [FALLBACK];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const multi = urls.length > 1;

  const go = useCallback(
    (delta: number) => {
      setActive((a) => (a + delta + urls.length) % urls.length);
    },
    [urls.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, go]);

  return (
    <div>
      {/* Main image */}
      <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-brand-900">
        <Image
          src={urls[active]}
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="cursor-zoom-in object-cover"
          onClick={() => setLightbox(true)}
        />
        <button
          onClick={() => setLightbox(true)}
          aria-label="View full screen"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          <Expand className="h-4 w-4" />
        </button>
        {multi && (
          <>
            <NavButton dir="left" onClick={() => go(-1)} />
            <NavButton dir="right" onClick={() => go(1)} />
            <span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">
              {active + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {multi && (
        <div className="mt-3 grid grid-cols-5 gap-2.5 sm:grid-cols-6">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg bg-brand-900 ring-2 transition",
                i === active
                  ? "ring-gold-400"
                  : "ring-white/10 hover:ring-white/30",
              )}
            >
              <Image
                src={url}
                alt={`${name} photo ${i + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/95"
          onClick={() => setLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm text-slate-300">
              {active + 1} / {urls.length}
            </span>
            <button
              onClick={() => setLightbox(false)}
              aria-label="Close"
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="relative flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={urls[active]}
              alt={name}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {multi && (
              <>
                <NavButton dir="left" large onClick={() => go(-1)} />
                <NavButton dir="right" large onClick={() => go(1)} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  dir,
  onClick,
  large,
}: {
  dir: "left" | "right";
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={dir === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/75",
        large ? "h-12 w-12" : "h-9 w-9 opacity-0 group-hover:opacity-100",
        dir === "left" ? "left-3" : "right-3",
      )}
    >
      {dir === "left" ? (
        <ChevronLeft className={large ? "h-6 w-6" : "h-5 w-5"} />
      ) : (
        <ChevronRight className={large ? "h-6 w-6" : "h-5 w-5"} />
      )}
    </button>
  );
}
