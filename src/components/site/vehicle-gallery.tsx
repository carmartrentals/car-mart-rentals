"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { VehicleImage } from "@/lib/types/database";

const FALLBACK =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80";

export function VehicleGallery({
  images,
  name,
}: {
  images: VehicleImage[];
  name: string;
}) {
  const sorted = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const urls = sorted.length ? sorted.map((i) => i.url) : [FALLBACK];
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-brand-900">
        <Image
          src={urls[active]}
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      {urls.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {urls.slice(0, 8).map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg bg-brand-900 ring-2 transition",
                i === active ? "ring-gold-400" : "ring-white/10 hover:ring-white/30",
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
    </div>
  );
}
