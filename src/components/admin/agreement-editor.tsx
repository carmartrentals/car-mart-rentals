"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { saveAgreementTemplate } from "@/app/admin/(panel)/settings/agreement-actions";
import type { AgreementSection } from "@/lib/types/database";

export function AgreementEditor({
  templateId,
  templateName,
  initialSections,
}: {
  templateId: string | null;
  templateName: string;
  initialSections: AgreementSection[];
}) {
  const router = useRouter();
  const [name, setName] = useState(templateName);
  const [sections, setSections] = useState<AgreementSection[]>(
    initialSections.length ? initialSections : [{ title: "", body: "" }],
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function update(i: number, patch: Partial<AgreementSection>) {
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));
  }
  function add() {
    setSections((s) => [...s, { title: "", body: "" }]);
  }
  function remove(i: number) {
    setSections((s) => s.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setSections((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveAgreementTemplate(templateId, name, sections);
      if (res.ok) {
        setResult({ ok: true, msg: "Agreement template saved." });
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error ?? "Could not save." });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rental Agreement Template</CardTitle>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">
          These sections appear on every rental agreement PDF. Editing them
          affects future agreements only — already-signed agreements keep their
          original terms.
        </p>

        {result && (
          <Alert tone={result.ok ? "success" : "error"}>{result.msg}</Alert>
        )}

        <Field label="Template Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="space-y-3">
          {sections.map((sec, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-500">
                  {i + 1}
                </span>
                <Input
                  value={sec.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Section title"
                  className="flex-1"
                />
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={() => remove(i)}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                value={sec.body}
                onChange={(e) => update(i, { body: e.target.value })}
                placeholder="Section text..."
                className="min-h-[72px]"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={pending}>
            <Save className="h-4 w-4" /> Save Template
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
