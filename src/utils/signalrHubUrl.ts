import { getApiBaseUrl } from "../config/apiBase";

declare const __VITE_SIGNALR_DEV_ORIGIN__: string;

/**
 * Status-stream hub URL.
 *
 * **Local dev:** Vite’s `/api` proxy often breaks SignalR WebSockets to HTTPS. In development we inject
 * `__VITE_SIGNALR_DEV_ORIGIN__` from `vite.config` (same host as `VITE_PROXY_TARGET`) so the hub uses
 * the API origin directly; REST still goes through `/api`.
 *
 * Override: `VITE_SIGNALR_ORIGIN` in `.env.local`, or set `VITE_SIGNALR_ORIGIN=""` to force same-origin proxy.
 */
export function getStatusStreamHubUrl(): string {
  const explicit = import.meta.env.VITE_SIGNALR_ORIGIN?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return `${explicit.replace(/\/$/, "")}/api/hubs/status-stream`;
  }
  if (
    import.meta.env.DEV &&
    typeof __VITE_SIGNALR_DEV_ORIGIN__ === "string" &&
    __VITE_SIGNALR_DEV_ORIGIN__.length > 0
  ) {
    return `${__VITE_SIGNALR_DEV_ORIGIN__.replace(/\/$/, "")}/api/hubs/status-stream`;
  }
  return `${getApiBaseUrl()}/hubs/status-stream`;
}

export function getProxyTrafficFlowHubUrl(overrideOrigin?: string | null): string {
  const override = overrideOrigin?.trim();
  if (override && override.length > 0) {
    return `${override.replace(/\/$/, "")}/hubs/proxy-traffic-flow`;
  }

  const explicitProxyFlow = import.meta.env.VITE_PROXY_TRAFFIC_FLOW_ORIGIN?.trim();
  if (explicitProxyFlow !== undefined && explicitProxyFlow.length > 0) {
    return `${explicitProxyFlow.replace(/\/$/, "")}/hubs/proxy-traffic-flow`;
  }

  const explicit = import.meta.env.VITE_SIGNALR_ORIGIN?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return `${explicit.replace(/\/$/, "")}/hubs/proxy-traffic-flow`;
  }

  // Fallback for setups where backend reverse-proxies this hub under /api.
  return `${getApiBaseUrl()}/hubs/proxy-traffic-flow`;
}
