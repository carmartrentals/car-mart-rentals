"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, MessageSquarePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { submitMyReview } from "@/app/account/(portal)/actions";

interface ExistingReview {
  rating: number;
  title: string | null;
  comment: string | null;
  is_published: boolean;
}

export function LeaveReview({
  reservationId,
  existingReview,
}: {
  reservationId: string;
  existingReview: ExistingReview | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // Already reviewed — show a read-only summary.
  if (existingReview) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Your Review</p>
          <Badge tone={existingReview.is_published ? "green" : "amber"}>
            {existingReview.is_published ? "Published" : "Pending approval"}
          </Badge>
        </div>
        <div className="mt-1.5 inline-flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-4 w-4",
                n <= existingReview.rating
                  ? "fill-gold-400 text-gold-400"
                  : "fill-white/10 text-white/10",
              )}
            />
          ))}
        </div>
        {existingReview.comment && (
          <p className="mt-1.5 text-sm text-slate-400">
            “{existingReview.comment}”
          </p>
        )}
      </div>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitMyReview({
        reservationId,
        rating,
        title,
        comment,
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(res.error ?? "Could not submit your review.");
      }
    });
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => {
        setDone(false);
        setError(null);
        setOpen(true);
      }}>
        <MessageSquarePlus className="h-4 w-4" /> Leave a Review
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Review Your Rental"
        description="Tell us about your experience — your review helps other customers."
        footer={
          done ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={pending}>
                Submit Review
              </Button>
            </>
          )
        }
      >
        {done ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Thank you for your feedback!
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Your review has been submitted and will appear on our website once
              approved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Your Rating <span className="text-rose-500">*</span>
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="p-0.5"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        n <= (hover || rating)
                          ? "fill-gold-500 text-gold-500"
                          : "fill-slate-200 text-slate-200",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Field label="Headline">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fantastic car, smooth pickup"
              />
            </Field>
            <Field label="Your Review" required>
              <Textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you enjoy about your rental?"
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
