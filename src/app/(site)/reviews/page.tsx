import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareQuote, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { StarRating } from "@/components/site/star-rating";
import { ReviewCard } from "@/components/site/review-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getReviewSummary } from "@/lib/data/reviews";
import { SITE_URL, COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Customer Reviews & Ratings",
  description:
    "Real reviews from Car Mart Rentals customers across Van Nuys and Los Angeles. See why drivers trust us for luxury and insurance-replacement rentals.",
  alternates: { canonical: "/reviews" },
};
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { reviews, count, average } = await getReviewSummary();

  // AggregateRating + Review schema — lets Google show stars next to the page
  // in search results, and unlocks rich review snippets.
  const reviewLd =
    count > 0
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${SITE_URL}/#business`,
          name: COMPANY.name,
          url: SITE_URL,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(average.toFixed(1)),
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 20).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.reviewer_name || "Customer" },
            datePublished: r.created_at,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            ...(r.comment ? { reviewBody: r.comment } : {}),
          })),
        }
      : null;

  return (
    <>
      {reviewLd && <JsonLd data={reviewLd} />}
      <PageHero
        eyebrow="What Our Customers Say"
        title="Customer Reviews"
        description="Real feedback from the people who have rented with Car Mart Rentals."
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          {count === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <MessageSquareQuote className="mx-auto h-9 w-9 text-slate-600" />
              <h2 className="mt-3 text-base font-semibold text-white">
                No reviews yet
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Be the first to experience our service.
              </p>
              <Link
                href="/vehicles"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
              >
                Browse Our Fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-12 flex max-w-md flex-col items-center text-center">
                <p className="heading-display text-6xl font-bold text-white">
                  {average.toFixed(1)}
                </p>
                <StarRating rating={average} size="lg" className="mt-2" />
                <p className="mt-2 text-sm text-slate-400">
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
