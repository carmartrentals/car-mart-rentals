import { Quote } from "lucide-react";
import { StarRating } from "@/components/site/star-rating";
import { formatDate } from "@/lib/utils";
import type { Review } from "@/lib/types/database";

/** A single customer review / testimonial card. */
export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="glass glass-hover flex h-full flex-col rounded-2xl p-6">
      <Quote className="h-7 w-7 text-gold-400/40" />
      <StarRating rating={review.rating} size="sm" className="mt-3" />
      {review.title && (
        <figcaption className="mt-3 text-sm font-semibold text-white">
          {review.title}
        </figcaption>
      )}
      {review.comment && (
        <blockquote className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">
          “{review.comment}”
        </blockquote>
      )}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-sm font-semibold text-slate-200">
          {review.reviewer_name}
        </p>
        <p className="text-xs text-slate-500">{formatDate(review.created_at)}</p>
      </div>
    </figure>
  );
}
