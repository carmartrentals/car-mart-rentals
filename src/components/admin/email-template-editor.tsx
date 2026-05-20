"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveEmailTemplate } from "@/app/admin/(panel)/email-templates/actions";
import type { EmailTemplate } from "@/lib/types/database";

export function EmailTemplateEditor({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  if (templates.length === 0) {
    return (
      <Alert tone="warning">
        No email templates found. Run the seed migration (0003) in Supabase.
      </Alert>
    );
  }
  return (
    <div className="space-y-5">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: EmailTemplate }) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body_html);
  const [active, setActive] = useState(template.is_active);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveEmailTemplate({
        id: template.id,
        subject,
        body_html: body,
        is_active: active,
      });
      if (res.ok) {
        setResult({ ok: true, msg: "Saved." });
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Could not save." });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500"
          />
          Active
        </label>
      </CardHeader>
      <CardBody className="space-y-4">
        {result && (
          <Alert tone={result.ok ? "success" : "error"}>{result.msg}</Alert>
        )}

        {template.variables.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              Available variables — paste these into the subject or body:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <code
                  key={v}
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        <Field label="Subject Line">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Email Body (HTML supported)">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[160px] font-mono text-xs"
          />
        </Field>

        <div className="flex items-center justify-end gap-3">
          {result?.ok && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Template
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
