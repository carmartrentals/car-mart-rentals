"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setVehicleGpsDevice } from "@/app/admin/(panel)/tracking/actions";

/** Inline editor for a vehicle's GPS device ID. */
export function DeviceIdCell({
  vehicleId,
  deviceId,
}: {
  vehicleId: string;
  deviceId: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(deviceId ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const dirty = value.trim() !== (deviceId ?? "");

  function save() {
    startTransition(async () => {
      await setVehicleGpsDevice(vehicleId, value);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="PassTime ID"
        className="h-8 w-36 rounded-md border border-slate-300 px-2 font-mono text-xs focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/40"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-900 text-white hover:bg-brand-800 disabled:opacity-50"
          aria-label="Save device ID"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {saved && <span className="text-xs text-emerald-600">Saved</span>}
    </div>
  );
}
