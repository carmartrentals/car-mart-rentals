import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareQuote, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { StarRating } from "@/components/site/star-rating";
import { ReviewCard } from "@/components/site/review-card";
import { getReviewSummary } from "@/lib/data/reviews";

export const metadata: Metadata = { title: "Customer Reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { reviews, count, average } = await getReviewSummary();

  return (
    <>
      <PageHero
        eyebrow="What Our Customers Say"
        title="Customer Reviews"
        description="Real feedback from the people who have rented with Car Mart Rentals."
      />

      <section className="bg-white py-14">
        <div className="container-px">
          {count === 0 ? (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <MessageSquareQuote className="mx-auto h-9 w-9 text-slate-300" />
              <h2 className="mt-3 text-base font-semibold text-slate-800">
                No reviews yet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Be the first to experience our service.
              </p>
              <Link
                href="/vehicles"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 hover:bg-gold-400"
              >
                Browse Our Fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-10 flex max-w-md flex-col items-center text-center">
                <p className="heading-display text-5xl font-bold text-slate-900">
                  {average.toFixed(1)}
                </p>
                <StarRating rating={average} size="lg" className="mt-2" />
                <p className="mt-2 text-sm text-slate-500">
                  Based on {count} customer review{count === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
