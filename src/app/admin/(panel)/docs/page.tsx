import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ADMIN_DOC_CATEGORIES } from "@/lib/admin-docs";

export default function DocsIndexPage() {
  const totalDocs = ADMIN_DOC_CATEGORIES.reduce(
    (sum, c) => sum + c.topics.length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Documentation"
        subtitle={`Internal handbook for staff — ${totalDocs} topics across ${ADMIN_DOC_CATEGORIES.length} categories. Bookmark this page for new hires.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_DOC_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.slug} className="transition-shadow hover:shadow-lg">
              <CardBody>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-900">
                      {cat.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {cat.description}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {cat.topics.map((doc) => (
                        <li key={doc.slug}>
                          <Link
                            href={`/admin/docs/${cat.slug}/${doc.slug}`}
                            className="group flex items-center justify-between gap-2 rounded px-1.5 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-gold-700"
                          >
                            <span className="truncate">{doc.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-gold-500" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-gold-200 bg-gold-50/30">
        <CardBody>
          <p className="flex items-start gap-3 text-sm text-slate-700">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            <span>
              <strong>Missing something?</strong> Tell me what topic you
              want documented and I&apos;ll add it. Docs are stored in{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                src/lib/admin-docs.tsx
              </code>
              {" "}so we can keep growing them as the system grows.
            </span>
          </p>
        </CardBody>
      </Card>
    </>
  );
}
