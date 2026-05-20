import Link from "next/link";
import Image from "next/image";
import { Users, Fuel, Gauge, Settings2 } from "lucide-react";
import type { VehicleWithImages } from "@/lib/types/database";
import { VEHICLE_CATEGORIES, FUEL_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80";

export function VehicleCard({ vehicle }: { vehicle: VehicleWithImages }) {
  const img = vehicle.main_image_url || FALLBACK_IMG;
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <Link
      href={`/vehicles/${vehicle.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Image
          src={img}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-brand-950/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gold-400">
          {VEHICLE_CATEGORIES[vehicle.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="heading-display text-lg font-bold text-slate-900">
          {name}
        </h3>
        {vehicle.trim && (
          <p className="text-sm text-slate-500">{vehicle.trim}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gold-600" /> {vehicle.seats} Seats
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4 text-gold-600" />
            {FUEL_TYPES[vehicle.fuel_type]}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4 text-gold-600" />
            {vehicle.transmission === "automatic" ? "Automatic" : "Manual"}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-gold-600" />
            {vehicle.mileage_limit === 0
              ? "Unlimited mi"
              : `${vehicle.mileage_limit} mi/day`}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Starting at</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(vehicle.daily_rate)}
              <span className="text-sm font-normal text-slate-500">/day</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Deposit {formatCurrency(vehicle.security_deposit)}
            </p>
          </div>
          <span className="rounded-lg bg-brand-950 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-gold-500 group-hover:text-brand-950">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}
