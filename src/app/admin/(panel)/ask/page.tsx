import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { AskAssistant } from "@/components/admin/ask-assistant";
import { aiConfigured } from "@/lib/ai";

export const metadata: Metadata = { title: "Ask AI" };

export default function AskPage() {
  return (
    <div>
      <PageHeader
        title="Ask AI"
        subtitle="Ask plain-language questions about your business and get answers from your live data."
      />
      {aiConfigured() ? (
        <AskAssistant />
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              This feature needs an OpenAI API key. Add{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                OPENAI_API_KEY
              </code>{" "}
              to your environment variables to enable it.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
