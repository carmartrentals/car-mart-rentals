"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What do I need to rent a car?",
  "Do you deliver vehicles?",
  "How does the security deposit work?",
];

/** Floating AI chat assistant shown on every public page. */
export function ChatWidget({ companyName }: { companyName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const greeting: Msg = {
    role: "assistant",
    content: `Hi! 👋 I'm the ${companyName} assistant. Ask me about our vehicles, pricing, or how renting works.`,
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  const allMessages = [greeting, ...messages];

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[520px] max-h-[calc(100vh-7rem)] w-[370px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-brand-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {companyName} Assistant
                </p>
                <p className="text-[11px] text-slate-400">
                  Typically replies instantly
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {allMessages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {messages.length === 0 && !loading && (
              <div className="space-y-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-gold-400/40 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-brand-950 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-gold-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-brand-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="bg-brand-950 px-3 pb-2 text-center text-[10px] text-slate-600">
            AI assistant — answers may not be perfect. Confirm details with our
            team.
          </p>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with us"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-brand-950 shadow-xl transition-transform hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}

// Matches markdown links [text](/path) and bare internal paths.
const LINK_RE =
  /\[([^\]]+)\]\((\/[^\s)]+)\)|(\/(?:vehicles\/[a-z0-9-]+|vehicles|booking|contact|offers|insurance-replacement)\b)/g;

/** Turn vehicle/booking links in an assistant reply into clickable links. */
function renderMessage(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = m[2] ?? m[3];
    const label = m[1] ?? m[3];
    out.push(
      <a
        key={key++}
        href={href}
        className="font-medium text-gold-300 underline underline-offset-2 hover:text-gold-200"
      >
        {label}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Bubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-gold-500 px-3 py-2 text-sm text-brand-950"
            : "max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
        }
      >
        {isUser ? content : renderMessage(content)}
      </div>
    </div>
  );
}
