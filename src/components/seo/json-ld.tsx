/**
 * Renders a JSON-LD structured-data <script> for SEO. Search engines read
 * this to show rich results (business info, vehicle listings, etc.).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
