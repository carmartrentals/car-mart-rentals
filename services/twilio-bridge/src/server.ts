import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { RealtimeSession } from "./realtime-session.js";

/**
 * Tiny HTTP+WebSocket server. Twilio Media Streams will WebSocket-upgrade
 * to ws(s)://<this-host>/twilio. We accept the upgrade and hand the socket
 * off to a RealtimeSession that bridges it to OpenAI Realtime.
 *
 * GET / returns a health check string so platform health checks pass.
 */
const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok\n");
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found\n");
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const pathname = req.url || "";
  if (pathname !== "/twilio") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log("[bridge] twilio ws connected");
    // Each connection gets its own session — Twilio opens a fresh WS per call.
    new RealtimeSession(ws);
  });
});

httpServer.listen(config.port, () => {
  console.log(
    `[bridge] listening on :${config.port} — model=${config.realtimeModel}`,
  );
});

process.on("SIGTERM", () => {
  console.log("[bridge] SIGTERM — shutting down");
  httpServer.close(() => process.exit(0));
});
