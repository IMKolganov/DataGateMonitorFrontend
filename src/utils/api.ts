import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type { Config, Certificate } from "../utils/types";
import type { ApiResponse } from "../utils/api-response";
import {
  HubConnectionBuilder,
  HttpTransportType,
  HubConnection
} from "@microsoft/signalr";

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

export const apiRequest = async <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  config: AxiosRequestConfig = {},
  skipAuth: boolean = false
): Promise<ApiResponse<T>> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem("token");
  if (!token && !skipAuth) {
    logout();
    throw new Error("User is not authenticated");
  }

  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      ...config,
      headers: {
        ...config.headers,
        ...(skipAuth ? {} : { Authorization: `Bearer ${token}` }),
      },
    });

    // blob responses should be handled by dedicated endpoints; if you still have them, keep a branch here
    return response.data as ApiResponse<T>;
  } catch (error: any) {
    if (!skipAuth && error.response?.status === 401) {
      logout();
    }
    throw error;
  }
};

export const fetchConfig = async (): Promise<Config> => {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const response = await fetch("/config.json");
      const config: Config = await response.json();

      const origin = window.location.origin;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      API_BASE_URL = `${origin}/api`;
      WS_BASE_URL = `${protocol}//${host}/api`;

      return {
        ...config,
        apiBaseUrl: API_BASE_URL,
      };
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  })();

  return configPromise;
};

export const ensureApiBaseUrl = async () => {
  if (!API_BASE_URL || !WS_BASE_URL) {
    await fetchConfig();
  }
};

export const getSignalRUrl = async (vpnServerId: string): Promise<string> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  return `${API_BASE_URL}/hubs/frontend?serverId=${vpnServerId}&access_token=${encodeURIComponent(token)}`;
};

export const getWebSocketUrlForBackgroundService = async (): Promise<string> => {
  await ensureApiBaseUrl();
  if (!WS_BASE_URL) throw new Error("WebSocket base URL is not set");

  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  return `${WS_BASE_URL}/OpenVpnServers/status-stream?access_token=${encodeURIComponent(token)}`;
};

export const getGeoLiteHubConnection = async (): Promise<HubConnection> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  const url = `${window.location.origin}/api/hubs/geoLite`;

  const connection = new HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => token,
      transport: HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect()
    .build();

  return connection;
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};






export type OverviewGrouping = "auto" | "hours" | "days" | "months" | "years";

export type OverviewSeriesRow = {
  ts: string;                 // ISO-8601 (UTC)
  activeClients: number;
  trafficInBytes: number;
  trafficOutBytes: number;
  trafficTotalBytes: number;
};

export type OverviewSeriesMeta = {
  from: string;               // ISO-8601
  to: string;                 // ISO-8601
  grouping: Exclude<OverviewGrouping, "auto">;
  timezone: string;
  trafficUnit: "bytes";       // <-- like on backend
  vpnServerId?: number | null;
};

export type OverviewSeriesSummary = {
  totalTrafficInBytes: number;
  totalTrafficOutBytes: number;
  peakActiveClients: number;
};

export type OverviewSeriesResponse = {
  meta: OverviewSeriesMeta;
  summary: OverviewSeriesSummary;
  series: OverviewSeriesRow[];
};

export type FetchOverviewSeriesParams = {
  from: Date;
  to: Date;
  grouping?: OverviewGrouping;   // default "auto"
  vpnServerId?: number | null;
  externalId?: string | null;
};

// always serialize as UTC ISO (…Z)
const toUtcIso = (d: Date | string | number) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString();
};

export const fetchOverviewSeries = async (
  params: FetchOverviewSeriesParams
): Promise<OverviewSeriesResponse> => {
  const { from, to, grouping = "auto", vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  qs.set("grouping", grouping);
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<OverviewSeriesResponse>(
    "get",
    `/OpenVpnServerClients/overview/series?${qs.toString()}`
  );
  return res.data;
};

export const fetchGeoPoints = async (
  params: FetchGeoPointsParams
): Promise<GeoPointAggDto[]> => {
  const { from, to, vpnServerId, externalId, onlyWithCoordinates = true } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  qs.set("onlyWithCoordinates", String(onlyWithCoordinates));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<GeoPointAggDto[]>(
    "get",
    `/OpenVpnServerClients/overview/points?${qs.toString()}`
  );
  return res.data;
};

export const fetchOverviewTotals = async (
  params: FetchOverviewTotalsParams
): Promise<OverviewTotalsResponse> => {
  const { from, to, vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<OverviewTotalsResponse>(
    "get",
    `/OpenVpnServerClients/overview/summary?${qs.toString()}`
  );
  return res.data;
};


export type GeoPointAggDto = {
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  sessionsCount: number;
  totalBytesIn: number;
  totalBytesOut: number;
};

export type FetchGeoPointsParams = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
  onlyWithCoordinates?: boolean;
};

export type OverviewTotalsResponse = {
  meta: {
    from: string;        // ISO
    to: string;          // ISO
    grouping: string;    // "none"
    timezone: string;    // "UTC"
    trafficUnit: string; // "bytes"
    vpnServerId?: number | null;
  };
  totals: {
    sessionsCount: number;
    usersCount: number;          // unique ExternalId
    trafficInBytes: number;
    trafficOutBytes: number;
    trafficTotalBytes: number;
  };
};

export type FetchOverviewTotalsParams = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
};