import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ARTICLES,
  getArticle,
  getRecentArticles,
  type BlogSection,
} from "@/lib/blog";
import { SITE_URL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
      authors: [article.author],
      images: [{ url: article.coverImage, alt: article.coverAlt }],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const moreArticles = getRecentArticles()
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);

  // BlogPosting schema — gives Google everything to index this as an article.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    image: [article.coverImage.startsWith("http") ? article.coverImage : `${SITE_URL}${article.coverImage}`],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      "@type": "Organization",
      name: article.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Car Mart Rentals",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${article.slug}` },
    articleSection: article.category,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  };

  return (
    <>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />

      <article className="bg-brand-950">
        {/* Header */}
        <header className="border-b border-white/10 bg-brand-950 py-14">
          <div className="container-px max-w-3xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-gold-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
            <p className="eyebrow mt-6">{article.category}</p>
            <h1 className="heading-display mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              {article.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {article.readingMinutes} min read
              </span>
              <span>By {article.author}</span>
            </div>
          </div>
        </header>

        {/* Cover image */}
        <div className="border-b border-white/10 bg-brand-950">
          <div className="container-px max-w-3xl py-8">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-brand-900">
              <Image
                src={article.coverImage}
                alt={article.coverAlt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-brand-950 py-12">
          <div className="container-px max-w-3xl">
            <div className="space-y-5 leading-relaxed text-slate-300">
              {article.body.map((section, i) => (
                <Section key={i} section={section} />
              ))}
            </div>

            {/* Related links */}
            {article.related.length > 0 && (
              <div className="mt-12 border-t border-white/10 pt-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Related
                </p>
                <ul className="mt-3 space-y-2">
                  {article.related.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-gold-300 hover:text-gold-200"
                      >
                        {r.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* More articles */}
        {moreArticles.length > 0 && (
          <section className="border-t border-white/10 bg-brand-900 py-14">
            <div className="container-px">
              <h2 className="heading-display text-2xl font-bold text-white">
                More from the blog
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {moreArticles.map((a) => (
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
                    <div className="flex flex-1 flex-col p-5">
                      <p className="eyebrow">{a.category}</p>
                      <h3 className="heading-display mt-2 text-base font-bold text-white">
                        {a.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function Section({ section }: { section: BlogSection }) {
  if (section.kind === "h2") {
    return (
      <h2 className="heading-display mt-8 text-xl font-bold text-white sm:text-2xl">
        {section.text}
      </h2>
    );
  }
  if (section.kind === "p") {
    return <p className="text-base leading-relaxed">{section.text}</p>;
  }
  if (section.kind === "list") {
    return (
      <ul className="ml-5 list-disc space-y-1.5 text-base leading-relaxed">
        {section.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (section.kind === "cta") {
    return (
      <div className="my-4">
        <Link
          href={section.href}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-950 transition-colors hover:bg-white"
        >
          {section.label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return null;
}
