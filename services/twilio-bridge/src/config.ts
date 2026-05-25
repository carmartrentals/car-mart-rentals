/**
 * Bridge service configuration. All values are read once at startup so
 * a misconfigured deployment crashes fast and visibly.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[bridge] FATAL: env var ${name} is required`);
    process.exit(1);
  }
  return v;
}

export const config = {
  /** Port the WebSocket server listens on. Render injects PORT automatically. */
  port: Number(process.env.PORT) || 8080,

  /** OpenAI API key for the Realtime session. */
  openaiApiKey: required("OPENAI_API_KEY"),

  /** Public base URL of the Vercel app — used for tool callbacks. */
  appBaseUrl: required("APP_BASE_URL").replace(/\/$/, ""),

  /** Shared secret between bridge and Vercel app — every callback sends it. */
  bridgeSecret: required("BRIDGE_SECRET"),

  /** Realtime model id. Mini is the cheap, fast tier — recommended default.
   *  GA models (May 2026+): gpt-realtime-mini (cheap), gpt-realtime (premium),
   *  gpt-realtime-2 (premium reasoning). The "preview" beta models are gone. */
  realtimeModel:
    process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
};
