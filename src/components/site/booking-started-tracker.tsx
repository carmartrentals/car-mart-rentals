"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires the `booking_started` GA4 event once when the /booking page mounts.
 * Lets the booking page stay a server component while still measuring
 * funnel entry.
 */
export function BookingStartedTracker({
  vehicleId,
  vehicleName,
}: {
  vehicleId: string;
  vehicleName: string;
}) {
  useEffect(() => {
    trackEvent("booking_started", {
      vehicle_id: vehicleId,
      vehicle: vehicleName,
    });
  }, [vehicleId, vehicleName]);
  return null;
}
