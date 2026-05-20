import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "default" | "green" | "amber" | "red" | "blue";

const TONES: Record<Tone, { icon: string; value: string }> = {
  default: { icon: "bg-slate-100 text-slate-600", value: "text-slate-900" },
  green: { icon: "bg-emerald-50 text-emerald-600", value: "text-slate-900" },
  amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  red: { icon: "bg-rose-50 text-rose-600", value: "text-rose-700" },
  blue: { icon: "bg-sky-50 text-sky-600", value: "text-slate-900" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
}) {
  const t = TONES[tone];
  const body = (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={cn("mt-1.5 text-2xl font-bold", t.value)}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", t.icon)}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
