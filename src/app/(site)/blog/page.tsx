import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, Newspaper } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { getRecentArticles } from "@/lib/blog";
import { SITE_URL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog — Car Rental Tips, Insurance Guides & Luxury Picks",
  description:
    "Insurance claim guides, luxury rental picks, and practical tips from the team at Car Mart Rentals in Van Nuys, CA.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const articles = getRecentArticles();

  // Blog ItemList for search engines.
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Car Mart Rentals Blog",
    url: `${SITE_URL}/blog`,
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${SITE_URL}/blog/${a.slug}`,
      datePublished: a.publishedAt,
      author: { "@type": "Organization", name: a.author },
    })),
  };

  return (
    <>
      <JsonLd data={blogLd} />
      <PageHero
        eyebrow="Car Mart Rentals Blog"
        title="Guides, Tips & Stories"
        description="Insurance claim guides, luxury rental picks, and practical tips for drivers in Van Nuys, the San Fernando Valley, and Greater Los Angeles."
      />

      <section className="bg-brand-950 py-16">
        <div className="container-px">
          {articles.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <Newspaper className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                New articles coming soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="group glass glass-hover flex flex-col overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-brand-900">
                    <Image
                      src={a.coverImage}
                      alt={a.coverAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="eyebrow">{a.category}</p>
                    <h2 className="heading-display mt-2 text-lg font-bold text-white">
                      {a.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-400">
                      {a.excerpt}
                    </p>
                    <div className="mt-5 flex items-center gap-4 border-t border-white/10 pt-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(a.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {a.readingMinutes} min read
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-gold-300 group-hover:text-gold-200">
                        Read <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
