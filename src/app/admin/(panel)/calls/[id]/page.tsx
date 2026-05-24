import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Clock,
  MessageSquare,
  PhoneForwarded,
  Sparkles,
  User,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { CallLog } from "@/lib/types/database";

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let call: CallLog | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("call_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    call = (data as CallLog) ?? null;
  } catch {
    notFound();
  }
  if (!call) notFound();

  return (
    <>
      <Link
        href="/admin/calls"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Calls
      </Link>

      <PageHeader
        title={call.caller_name ? `Call from ${call.caller_name}` : "Call"}
        subtitle={formatDateTime(call.started_at)}
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* TRANSCRIPT */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            {call.recording_url && (
              <audio
                controls
                src={`${call.recording_url}.mp3`}
                className="h-8 w-64"
              />
            )}
          </CardHeader>
          <CardBody className="space-y-3">
            {call.transcript.length === 0 ? (
              <p className="text-sm text-slate-400">
                No conversation recorded for this call.
              </p>
            ) : (
              call.transcript.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "flex items-start gap-2.5"
                      : "flex items-start gap-2.5 rounded-lg bg-slate-50 p-3"
                  }
                >
                  <span
                    className={
                      m.role === "user"
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"
                        : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700"
                    }
                  >
                    {m.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {m.role === "user" ? "Caller" : "AI Assistant"}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                      {m.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* SUMMARY + META */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm leading-relaxed text-slate-700">
                {call.ai_summary || "(No summary yet.)"}
              </p>
              {call.customer_intent && (
                <div className="mt-3">
                  <Badge tone="gray">
                    {call.customer_intent.replace(/_/g, " ")}
                  </Badge>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row label="Caller" icon={Phone}>
                {call.from_number ? (
                  <a
                    href={`tel:${call.from_number}`}
                    className="text-gold-700 hover:underline"
                  >
                    {call.from_number}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Answered by" icon={Phone}>
                {call.to_number || "—"}
              </Row>
              <Row label="Started" icon={Clock}>
                {formatDateTime(call.started_at)}
              </Row>
              <Row label="Ended" icon={Clock}>
                {call.ended_at ? formatDateTime(call.ended_at) : "—"}
              </Row>
              <Row label="Duration" icon={Clock}>
                {formatDuration(call.duration_seconds)}
              </Row>
              <Row label="Status" icon={Phone}>
                <Badge tone={call.status === "completed" ? "green" : "gray"}>
                  {call.status}
                </Badge>
              </Row>
              {call.sms_sent && (
                <Row label="SMS booking link" icon={MessageSquare}>
                  <span className="text-emerald-700">Sent during call ✓</span>
                </Row>
              )}
              {call.transferred && (
                <Row label="Transferred" icon={PhoneForwarded}>
                  <span className="text-amber-700">Routed to a human ✓</span>
                </Row>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right text-slate-700">{children}</span>
    </div>
  );
}
