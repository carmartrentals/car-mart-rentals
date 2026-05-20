import { PageHeader } from "@/components/admin/page-header";
import { WebsitePageEditor } from "@/components/admin/website-page-editor";
import { Alert } from "@/components/ui/misc";
import { getPageContent, PAGE_KEYS, PAGE_LABELS } from "@/lib/website-content";

const TITLE_PLACEHOLDER: Record<string, string> = {
  about: "Heading (optional)",
  faq: "Question",
  terms: "Section heading",
  privacy: "Section heading",
};

export default async function WebsiteContentPage() {
  const pages = await Promise.all(
    PAGE_KEYS.map(async (key) => ({
      key,
      content: await getPageContent(key),
    })),
  );

  return (
    <>
      <PageHeader
        title="Website Content"
        subtitle="Edit the text on your public About, FAQ, Terms and Privacy pages."
      />

      <div className="mb-6">
        <Alert tone="info">
          Changes here update the live website immediately after saving. Each
          block becomes a section on the page.
        </Alert>
      </div>

      <div className="space-y-6">
        {pages.map(({ key, content }) => (
          <WebsitePageEditor
            key={key}
            pageKey={key}
            label={PAGE_LABELS[key]}
            titlePlaceholder={TITLE_PLACEHOLDER[key]}
            initialSections={content.sections}
          />
        ))}
      </div>
    </>
  );
}
