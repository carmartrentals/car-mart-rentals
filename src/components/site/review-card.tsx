import { Quote } from "lucide-react";
import { StarRating } from "@/components/site/star-rating";
import { formatDate } from "@/lib/utils";
import type { Review } from "@/lib/types/database";

/** A single customer review / testimonial card. */
export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-card">
      <Quote className="h-7 w-7 text-gold-200" />
      <StarRating rating={review.rating} size="sm" className="mt-3" />
      {review.title && (
        <figcaption className="mt-3 text-sm font-semibold text-slate-900">
          {review.title}
        </figcaption>
      )}
      {review.comment && (
        <blockquote className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">
          “{review.comment}”
        </blockquote>
      )}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold text-slate-800">
          {review.reviewer_name}
        </p>
        <p className="text-xs text-slate-400">{formatDate(review.created_at)}</p>
      </div>
    </figure>
  );
}
