import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Alert, EmptyState } from "@/components/ui/misc";
import { formatCurrency } from "@/lib/utils";
import {
  getVehicleStats,
  getDemandOutlook,
} from "@/lib/data/pricing-insights";
import { generatePricingBrief } from "@/lib/ai-pricing";
import { aiConfigured } from "@/lib/ai";
import { ApplyPricingButton } from "@/components/admin/apply-pricing-button";
import { RefreshPricingButton } from "@/components/admin/refresh-pricing-button";

export const dynamic = "force-dynamic";

const DIRECTION_TONE: Record<
  string,
  { tone: "green" | "red" | "gray"; icon: typeof TrendingUp }
> = {
  up: { tone: "green", icon: TrendingUp },
  down: { tone: "red", icon: TrendingDown },
  hold: { tone: "gray", icon: Minus },
};

const CONFIDENCE_TONE: Record<string, "green" | "amber" | "gray"> = {
  high: "green",
  medium: "amber",
  low: "gray",
};

export default async function PricingPage() {
  const stats = await getVehicleStats();
  const outlook = await getDemandOutlook(14);
  const brief = aiConfigured()
    ? await generatePricingBrief(stats, outlook)
    : null;

  // Build a quick lookup from vehicleId -> suggestion.
  const suggestionByVehicle = new Map(
    (brief?.suggestions ?? []).map((s) => [s.vehicleId, s] as const),
  );

  const totalUpcomingDays = outlook.reduce((s, d) => s + d.vehiclesBooked, 0);
  const totalAvailableDays = outlook.reduce((s, d) => s + d.vehiclesTotal, 0);
  const upcomingFillRate =
    totalAvailableDays > 0
      ? Math.round((totalUpcomingDays / totalAvailableDays) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Dynamic Pricing"
        subtitle="AI-recommended rate changes based on demand, utilization and forward bookings."
        actions={<RefreshPricingButton />}
      />

      {!aiConfigured() && (
        <div className="mb-4">
          <Alert tone="warning">
            AI features are not configured. Add{" "}
            <code>OPENAI_API_KEY</code> to your Vercel environment to enable
            pricing suggestions.
          </Alert>
        </div>
      )}

      {/* AI EXECUTIVE BRIEF */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-600" />
              Pricing Brief
            </span>
          </CardTitle>
          {brief && (
            <span className="text-xs text-slate-500">
              Generated {new Date(brief.generatedAt).toLocaleString()}
            </span>
          )}
        </CardHeader>
        <CardBody>
          {brief ? (
            <p className="leading-relaxed text-slate-700">{brief.summary}</p>
          ) : (
            <p className="text-sm text-slate-500">
              The AI analyst will generate a brief once OpenAI is configured and
              you have at least one vehicle in the fleet.
            </p>
          )}
        </CardBody>
      </Card>

      {/* DEMAND OUTLOOK */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>14-Day Demand Outlook</CardTitle>
          <span className="text-xs text-slate-500">
            Fleet fill rate: <strong>{upcomingFillRate}%</strong>
          </span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-7 gap-1.5">
            {outlook.map((d) => {
              const pct =
                d.vehiclesTotal > 0
                  ? Math.round((d.vehiclesBooked / d.vehiclesTotal) * 100)
                  : 0;
              const tone =
                pct >= 80
                  ? "bg-rose-500"
                  : pct >= 60
                    ? "bg-amber-500"
                    : pct >= 30
                      ? "bg-emerald-500"
                      : "bg-slate-300";
              return (
                <div
                  key={d.date}
                  className="rounded-md border border-slate-200 bg-slate-50 p-2 text-center"
                  title={`${d.vehiclesBooked} of ${d.vehiclesTotal} booked`}
                >
                  <p className="text-[10px] font-medium uppercase text-slate-500">
                    {d.dayOfWeek}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-700">
                    {d.date.slice(5)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${tone}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{pct}%</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* PER-VEHICLE SUGGESTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Vehicle Pricing Suggestions</CardTitle>
        </CardHeader>
        {stats.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No vehicles yet"
            description="Add vehicles to your fleet to start getting pricing suggestions."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Vehicle</TH>
                <TH>Utilization (90d)</TH>
                <TH>Upcoming (30d)</TH>
                <TH>Current Daily</TH>
                <TH>Suggested Daily</TH>
                <TH>Rationale</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {stats.map((s) => {
                const suggestion = suggestionByVehicle.get(s.vehicle.id);
                const dirCfg =
                  DIRECTION_TONE[suggestion?.direction ?? "hold"];
                const Icon = dirCfg.icon;
                const utilPct = Math.round(s.past90.utilization * 100);
                const upcomingPct = Math.round(s.upcoming.utilization * 100);
                const currentDaily = Number(s.vehicle.daily_rate);
                const newDaily = suggestion?.dailyRate ?? null;
                const delta =
                  newDaily !== null
                    ? Math.round(((newDaily - currentDaily) / currentDaily) * 100)
                    : null;

                return (
                  <TR key={s.vehicle.id}>
                    <TD>
                      <span className="block font-medium text-slate-800">
                        {s.vehicle.year} {s.vehicle.make} {s.vehicle.model}
                      </span>
                      <span className="text-xs text-slate-500">
                        {s.vehicle.trim} · {s.vehicle.category}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${
                              utilPct >= 80
                                ? "bg-rose-500"
                                : utilPct >= 50
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                            }`}
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {utilPct}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatCurrency(s.past90.revenue)} · {s.past90.daysBooked}d
                      </p>
                    </TD>
                    <TD>
                      <span className="text-sm font-medium text-slate-700">
                        {upcomingPct}%
                      </span>
                      <p className="text-xs text-slate-500">
                        {s.upcoming.reservationCount} reservation
                        {s.upcoming.reservationCount === 1 ? "" : "s"}
                      </p>
                    </TD>
                    <TD className="font-medium text-slate-700">
                      {formatCurrency(currentDaily)}
                    </TD>
                    <TD>
                      {newDaily !== null ? (
                        <div>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(newDaily)}
                          </span>
                          {delta !== null && delta !== 0 && (
                            <span
                              className={`ml-1.5 text-xs font-medium ${
                                delta > 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta}%
                            </span>
                          )}
                        </div>
                      ) : suggestion ? (
                        <Badge tone={dirCfg.tone}>
                          <Icon className="mr-0.5 inline h-3 w-3" />
                          Hold
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {suggestion && (
                        <Badge
                          tone={CONFIDENCE_TONE[suggestion.confidence]}
                          className="ml-1 align-middle"
                        >
                          {suggestion.confidence}
                        </Badge>
                      )}
                    </TD>
                    <TD className="max-w-md text-xs text-slate-600">
                      {suggestion?.rationale || (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      {suggestion && suggestion.direction !== "hold" && (
                        <ApplyPricingButton
                          vehicleId={s.vehicle.id}
                          rates={{
                            daily: suggestion.dailyRate,
                            weekend: suggestion.weekendRate,
                            weekly: suggestion.weeklyRate,
                            monthly: suggestion.monthlyRate,
                          }}
                        />
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <p className="mt-3 text-xs text-slate-400">
        Brief regenerates every 12 hours, or click Refresh to force a new
        analysis (costs ~$0.002 in OpenAI tokens).
      </p>
    </>
  );
}
