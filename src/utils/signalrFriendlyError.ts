/**
 * Replace long SignalR stack traces with short hints (status-stream hub).
 */
export function humanizeSignalRStatusStreamError(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.toLowerCase();
  if (
    t.includes("disabled by the client") &&
    t.includes("websocket") &&
    t.includes("unable to connect")
  ) {
    return (
      "SignalR excluded WebSockets in the client transport mask while no other transport succeeded. " +
      "Remove VITE_SIGNALR_SKIP_WEBSOCKETS from .env (default is all transports), or fix negotiate / API scale-out."
    );
  }

  /** Text SignalR uses when negotiate and WS land on different nodes, or affinity is missing. */
  const looksLikeAffinityOrScaleOut =
    t.includes("connection id is not present") ||
    t.includes("sticky sessions") ||
    t.includes("could not be found on the server") ||
    t.includes("multiple servers");

  if (looksLikeAffinityOrScaleOut) {
    return (
      "Live status stream: WebSocket did not match the negotiate session (common with several API instances " +
      "or a load balancer without affinity for `/api/hubs`). Fix: sticky sessions / same-origin routing for the hub, " +
      "or a SignalR scale-out setup on the API."
    );
  }

  /** Any other WebSocket transport failure — do not assume “local dev only” or sticky sessions. */
  if (
    t.includes("websocket") &&
    (t.includes("failed to connect") ||
      t.includes("failed to start the transport") ||
      t.includes("there was an error with the transport"))
  ) {
    return (
      "Live status stream: WebSocket to /api/hubs/status-stream failed. " +
      "Check WSS/proxy/TLS, API reachability, or (on the API) allow long polling for this hub if WebSockets are blocked " +
      "(config SignalR:StatusStreamAllowLongPolling — env SignalR__StatusStreamAllowLongPolling)."
    );
  }

  return raw;
}
