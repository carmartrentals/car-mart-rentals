import Link from "next/link";
import Image from "next/image";
import { Users, Fuel, Gauge, Settings2, ArrowUpRight } from "lucide-react";
import type { VehicleWithImages } from "@/lib/types/database";
import { VEHICLE_CATEGORIES, FUEL_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

// Local placeholder served from /public — branded and instant, no external CDN.
const FALLBACK_IMG = "/fleet-placeholder.jpg";

export function VehicleCard({ vehicle }: { vehicle: VehicleWithImages }) {
  const img = vehicle.main_image_url || FALLBACK_IMG;
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <Link
      href={`/vehicles/${vehicle.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:bg-white/[0.06] hover:shadow-glow"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-900">
        <Image
          src={img}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-brand-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-300 backdrop-blur">
          {VEHICLE_CATEGORIES[vehicle.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="heading-display text-lg font-bold text-white">
          {name}
        </h3>
        {vehicle.trim && (
          <p className="text-sm text-slate-400">{vehicle.trim}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm text-slate-300">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gold-400" /> {vehicle.seats} Seats
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4 text-gold-400" />
            {FUEL_TYPES[vehicle.fuel_type]}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4 text-gold-400" />
            {vehicle.transmission === "automatic" ? "Automatic" : "Manual"}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-gold-400" />
            {vehicle.mileage_limit === 0
              ? "Unlimited mi"
              : `${vehicle.mileage_limit} mi/day`}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Starting at
            </p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(vehicle.daily_rate)}
              <span className="text-sm font-normal text-slate-400">/day</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Deposit {formatCurrency(vehicle.security_deposit)}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-950 transition-colors group-hover:bg-white">
            Details <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
