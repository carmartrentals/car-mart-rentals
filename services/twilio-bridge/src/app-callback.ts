import { config } from "./config.js";

/**
 * Thin HTTP client for talking back to the Vercel app. Every call carries
 * the shared bridge secret so the app can reject random internet traffic.
 */
async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.appBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": config.bridgeSecret,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `app callback ${path} failed: ${res.status} ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

/** Fetch the session config — system prompt, voice, tools, owner phone. */
export interface SessionConfig {
  systemPrompt: string;
  voice: string;
  greeting: string;
  tools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  ownerPhone: string | null;
}

export async function fetchSessionConfig(args: {
  callSid: string;
  fromNumber: string | null;
  toNumber: string | null;
}): Promise<SessionConfig> {
  return post<SessionConfig>("/api/twilio/bridge/start", args);
}

/** Execute a function call (send booking email, transfer, end). */
export interface ToolResult {
  result: string;
  /** Set when the bridge should hang up the call after speaking the next reply. */
  endCall?: boolean;
  /** Set when the bridge should dial the owner. */
  transferTo?: string | null;
}

export async function executeTool(args: {
  callSid: string;
  name: string;
  arguments: Record<string, unknown>;
}): Promise<ToolResult> {
  return post<ToolResult>("/api/twilio/bridge/tool", args);
}

/** Persist the final transcript + cost data when the call ends. */
export async function logCallEnd(args: {
  callSid: string;
  transcript: Array<{ role: "user" | "assistant"; content: string; at: string }>;
  inputAudioTokens: number;
  outputAudioTokens: number;
  inputTextTokens: number;
  outputTextTokens: number;
}): Promise<void> {
  await post("/api/twilio/bridge/log", args);
}
