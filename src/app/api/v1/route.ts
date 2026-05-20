import { apiJson } from "@/lib/api";

/** GET /api/v1 — API discovery document for the mobile app integration. */
export async function GET() {
  return apiJson({
    name: "Car Mart Rentals API",
    version: "1.0",
    auth: {
      scheme: "Bearer token",
      modes: [
        "Service secret (API_BEARER_SECRET) for server-to-server",
        "Supabase user access token for authenticated staff/customers",
      ],
    },
    endpoints: {
      "GET /api/v1/vehicles": "List fleet (public). Filters: category, fuel_type, status, q",
      "GET /api/v1/vehicles/:id": "Vehicle by id or slug (public)",
      "GET /api/v1/availability": "Availability check. Params: vehicle_id, start, end",
      "GET /api/v1/reservations": "List reservations (auth)",
      "POST /api/v1/reservations": "Create a reservation (auth)",
      "GET /api/v1/customers": "List customers (auth)",
      "POST /api/v1/customers": "Create a customer (auth)",
    },
    roadmap: {
      phase2: ["check-in / check-out", "inspection photos", "invoices", "agreements", "payments"],
      phase4: ["staff mobile app", "telematics / GPS"],
    },
  });
}
