import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating display (1–5). */
export function StarRating({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cn("inline-flex", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            dim,
            n <= Math.round(rating)
              ? "fill-gold-400 text-gold-400"
              : "fill-white/10 text-white/10",
          )}
        />
      ))}
    </span>
  );
}
