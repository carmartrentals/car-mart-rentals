import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { LocationManager } from "@/components/admin/location-manager";
import { Alert } from "@/components/ui/misc";
import type { Location } from "@/lib/types/database";

export default async function LocationsPage() {
  let locations: Location[] = [];
  let configError = false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("locations")
      .select("*")
      .order("name");
    locations = (data as Location[]) ?? [];
  } catch {
    configError = true;
  }

  return (
    <>
      <PageHeader
        title="Locations"
        subtitle="Your rental branch locations for pickups and returns."
      />

      {configError && (
        <div className="mb-4">
          <Alert tone="warning">
            Could not load locations. Check Supabase configuration.
          </Alert>
        </div>
      )}

      <LocationManager locations={locations} />
    </>
  );
}
