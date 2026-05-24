"use server";

import { getCurrentUser, canWrite } from "@/lib/auth";
import { decodeVin, type VinDecodeResult } from "@/lib/vin-decoder";

export interface VinActionResult {
  ok: boolean;
  error?: string;
  data?: VinDecodeResult;
}

/** Server-side VIN decode — calls NHTSA + OpenAI behind the scenes. */
export async function decodeVinAction(vin: string): Promise<VinActionResult> {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, "vehicles")) {
    return { ok: false, error: "You do not have permission to decode VINs." };
  }
  try {
    const data = await decodeVin(vin);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not decode that VIN.",
    };
  }
}
