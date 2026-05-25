import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { findAdminDoc, ADMIN_DOC_CATEGORIES } from "@/lib/admin-docs";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export default async function DocPage({ params }: PageProps) {
  const { category: categorySlug, slug } = await params;
  const found = findAdminDoc(categorySlug, slug);
  if (!found) notFound();
  const { category, doc } = found;

  // Other topics in the same category — rendered as a left sidebar so
  // the operator can jump between related docs without going back to
  // the index.
  const siblingDocs = category.topics;

  return (
    <>
      <Link
        href="/admin/docs"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Documentation
      </Link>

      <PageHeader
        title={doc.title}
        subtitle={`${category.title} · ${doc.description}`}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar — other docs in this category */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody className="p-3">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {category.title}
              </p>
              <ul className="space-y-0.5">
                {siblingDocs.map((d) => {
                  const isCurrent = d.slug === doc.slug;
                  return (
                    <li key={d.slug}>
                      <Link
                        href={`/admin/docs/${category.slug}/${d.slug}`}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                          isCurrent
                            ? "bg-gold-50 font-medium text-gold-800"
                            : "text-slate-700 hover:bg-slate-50 hover:text-gold-700"
                        }`}
                      >
                        <span className="truncate">{d.title}</span>
                        {isCurrent && (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gold-500" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Other Categories
                </p>
                <ul className="mt-1 space-y-0.5">
                  {ADMIN_DOC_CATEGORIES.filter(
                    (c) => c.slug !== category.slug,
                  ).map((c) => {
                    const Icon = c.icon;
                    return (
                      <li key={c.slug}>
                        <Link
                          href={`/admin/docs/${c.slug}/${c.topics[0]?.slug ?? ""}`}
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-gold-700"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{c.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardBody>
          </Card>
        </aside>

        {/* Main doc body */}
        <article>
          <Card>
            <CardBody className="prose-sm max-w-none">
              <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                Last updated {doc.updatedAt}
              </div>
              {doc.content}
            </CardBody>
          </Card>

          <Card className="mt-6 border-slate-200 bg-slate-50/50">
            <CardBody>
              <p className="flex items-start gap-2 text-xs text-slate-600">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>
                  This doc is part of the internal handbook. To request
                  edits or expansion, mention the doc title (
                  <strong>{doc.title}</strong>) and what should change.
                </span>
              </p>
            </CardBody>
          </Card>
        </article>
      </div>
    </>
  );
}
