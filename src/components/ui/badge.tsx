import { cn } from "@/lib/utils";
import { BADGE_TONES } from "@/lib/constants";

type Tone = keyof typeof BADGE_TONES;

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Renders a colored dot + label from a status map entry. */
export function StatusBadge({
  status,
}: {
  status: { label: string; tone: Tone };
}) {
  return <Badge tone={status.tone}>{status.label}</Badge>;
}
