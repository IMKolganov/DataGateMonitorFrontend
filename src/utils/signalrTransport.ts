import { HttpTransportType } from "@microsoft/signalr";

const ALL_TRANSPORTS =
  HttpTransportType.WebSockets |
  HttpTransportType.ServerSentEvents |
  HttpTransportType.LongPolling;

const SSE_AND_LONG_POLLING =
  HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling;

/**
 * Shared SignalR transport mask for browser clients.
 *
 * **Default: WebSockets | SSE | LongPolling** — SignalR tries transports in server negotiate order;
 * if WebSocket fails, SSE / long polling still run. Using **only** SSE|LP caused “WebSockets is
 * disabled by the client” when negotiate exposed no usable fallback for that mask.
 *
 * - `VITE_SIGNALR_SKIP_WEBSOCKETS=1` → ServerSentEvents | LongPolling (quieter console if WS always fails)
 * - `VITE_SIGNALR_LONG_POLLING_ONLY=1` or `VITE_SIGNALR_PREFER_LONG_POLLING=1` → LongPolling only
 */
export function getSignalRPreferredTransport(): HttpTransportType {
  const forceLp =
    String(import.meta.env.VITE_SIGNALR_LONG_POLLING_ONLY ?? "").trim() === "1";
  const preferLp =
    String(import.meta.env.VITE_SIGNALR_PREFER_LONG_POLLING ?? "").trim() === "1";
  const skipWebSockets =
    String(import.meta.env.VITE_SIGNALR_SKIP_WEBSOCKETS ?? "").trim() === "1";

  if (forceLp || preferLp) {
    return HttpTransportType.LongPolling;
  }
  if (skipWebSockets) {
    return SSE_AND_LONG_POLLING;
  }
  return ALL_TRANSPORTS;
}
