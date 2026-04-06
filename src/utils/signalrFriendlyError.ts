/**
 * Replace long SignalR stack traces with a short hint for known local-dev / LB cases.
 */
export function humanizeSignalRStatusStreamError(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.toLowerCase();
  if (
    t.includes("connection id is not present") ||
    t.includes("sticky sessions") ||
    (t.includes("websocket") && t.includes("failed to connect"))
  ) {
    return (
      "Live status stream cannot connect from local dev: the WebSocket step did not reach the same API " +
      "instance as negotiate (typical when the load balancer has no sticky sessions for WebSockets). " +
      "This usually works on the deployed site. Fix: session affinity for /api/hubs on the API host, " +
      "or run the backend locally."
    );
  }
  return raw;
}
