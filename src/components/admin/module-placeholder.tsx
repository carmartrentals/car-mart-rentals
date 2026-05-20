import { Construction, Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Standardized "module coming soon" panel for features scheduled in a
 * later build phase. The schema, types and API for these modules already
 * exist — only the admin UI is pending.
 */
export function ModulePlaceholder({
  phase,
  features,
}: {
  phase: string;
  features: string[];
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50">
          <Construction className="h-7 w-7 text-gold-600" />
        </span>
        <div className="mt-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Module Scheduled
          </h2>
          <Badge tone="amber">{phase}</Badge>
        </div>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          The database schema, TypeScript types and core API for this module
          are already in place. The admin interface below is part of the next
          build phase.
        </p>
        <ul className="mt-6 grid max-w-md gap-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
