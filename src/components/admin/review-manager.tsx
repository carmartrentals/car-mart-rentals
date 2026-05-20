"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { saveReview, toggleReviewPublished } from "@/app/admin/(panel)/reviews/actions";
import type { Review } from "@/lib/types/database";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating ? "fill-gold-500 text-gold-500" : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

const EMPTY = {
  reviewer_name: "", rating: "5", title: "", comment: "",
  vehicle_id: "", is_published: true,
};

export function ReviewManager({
  reviews,
  vehicles,
}: {
  reviews: Review[];
  vehicles: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openNew() {
    setError(null);
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(r: Review) {
    setError(null);
    setEditId(r.id);
    setForm({
      reviewer_name: r.reviewer_name,
      rating: String(r.rating),
      title: r.title ?? "",
      comment: r.comment ?? "",
      vehicle_id: r.vehicle_id ?? "",
      is_published: r.is_published,
    });
    setOpen(true);
  }
  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveReview({
        id: editId ?? undefined,
        reviewer_name: form.reviewer_name,
        rating: Number(form.rating),
        title: form.title,
        comment: form.comment,
        vehicle_id: form.vehicle_id,
        is_published: form.is_published,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not save.");
      }
    });
  }
  function togglePublish(r: Review) {
    startTransition(async () => {
      await toggleReviewPublished(r.id, !r.is_published);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">
          {reviews.length} review(s)
        </h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add Review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Add customer reviews — published ones appear on your website."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-semibold text-slate-800">
                    {r.reviewer_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.title && (
                  <p className="mt-1 text-sm font-medium text-slate-700">{r.title}</p>
                )}
                {r.comment && (
                  <p className="mt-0.5 text-sm text-slate-500">{r.comment}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => togglePublish(r)} disabled={pending}>
                  <Badge tone={r.is_published ? "green" : "gray"}>
                    {r.is_published ? "Published" : "Hidden"}
                  </Badge>
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-gold-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit Review" : "Add Review"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={pending}>Save Review</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reviewer Name" required>
              <Input value={form.reviewer_name}
                onChange={(e) => set("reviewer_name", e.target.value)} />
            </Field>
            <Field label="Rating">
              <Select value={form.rating}
                onChange={(e) => set("rating", e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Headline">
            <Input value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Fantastic service" />
          </Field>
          <Field label="Review">
            <Textarea value={form.comment}
              onChange={(e) => set("comment", e.target.value)} />
          </Field>
          <Field label="Vehicle (optional)">
            <Select value={form.vehicle_id}
              onChange={(e) => set("vehicle_id", e.target.value)}>
              <option value="">Not specified</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
            Published on the website
          </label>
        </div>
      </Modal>
    </Card>
  );
}
