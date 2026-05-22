import { formatCurrency } from "@/lib/utils";
import type { MonthRevenue } from "@/lib/data/dashboard";

/** Simple CSS bar chart of monthly revenue — no charting library needed. */
export function RevenueChart({
  data,
  thisMonth,
  lastMonth,
  thisYear,
}: {
  data: MonthRevenue[];
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">
        Revenue — Last 6 Months
      </h2>

      <div className="mt-4 flex h-40 items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-400">
              {d.amount > 0 ? formatCurrency(d.amount) : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-gold-400"
                style={{ height: `${Math.max(2, (d.amount / max) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
        <Figure label="This Month" value={thisMonth} />
        <Figure label="Last Month" value={lastMonth} />
        <Figure label="This Year" value={thisYear} />
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
