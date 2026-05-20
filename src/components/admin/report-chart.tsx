"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/** Simple branded bar chart for the reports module. */
export function ReportBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        No data for this period.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#64748b" }}
          interval={0}
          stroke="#cbd5e1"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#64748b" }}
          stroke="#cbd5e1"
          tickFormatter={(v: number) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
        />
        <Tooltip
          formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="value" fill="#c8a45c" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
