import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type { Config, Certificate } from "../utils/types";
import {
  HubConnectionBuilder,
  HttpTransportType,
  HubConnection
} from "@microsoft/signalr";
import { cleanDate } from "../utils/utils";

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

const apiRequest = async <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  config: AxiosRequestConfig = {},
  skipAuth: boolean = false
): Promise<T> => {
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

    return config.responseType === "blob" ? (response as any) : response.data;
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

const ensureApiBaseUrl = async () => {
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


export const runServiceNow = async (): Promise<void> => {
  await apiRequest<void>("post", "/OpenVpnServers/run-now");
};

export const fetchServers = async (): Promise<any[]> => {
  const response = await apiRequest<{ data: any[] }>("get", "/OpenVpnServers/GetAllServersWithStatus");
  return response.data;
}

export const fetchServersWithStats = async (id: string): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServers/GetServerWithStatus/${id}`);
  return response.data;
};

export const fetchConnectedClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllConnectedClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const fetchHistoryClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {

  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllHistoryClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const deleteServer = async (id: number) => {
  return apiRequest<void>("delete", `/OpenVpnServers/DeleteServer/${id}`, );
};

export const fetchCertificates = async (
  vpnServerId: string,
  status?: string
): Promise<Certificate[]> => {
  const endpoint = status
    ? `/OpenVpnServerCerts/${vpnServerId}/GetAllVpnServerCertificatesByStatus`
    : `/OpenVpnServerCerts/${vpnServerId}/GetAllCertificates`;

  const apiResponse = await apiRequest<{
    success: boolean;
    message: string;
    data: {
      serverCertificates: any[];
    };
  }>("get", endpoint, {
    params: status ? { certificateStatus: status } : {},
  });

  const certs = apiResponse.data?.serverCertificates;

  if (!Array.isArray(certs)) {
    console.error("serverCertificates is not an array:", certs);
    return [];
  }

  return certs.map((raw) => {
    const status = raw.status ?? (raw.isRevoked ? 1 : 0);

    // const cleanRevokeDate =
    //   raw.revokeDate === "0001-01-01T00:00:00" || raw.revokeDate === null
    //     ? null
    //     : raw.revokeDate;

    return {
      ...raw,
      status,
      expiryDate: raw.expiryDate ?? null,
      revokeDate: cleanDate(raw.revokeDate),
      serialNumber: raw.serialNumber ?? "",
    } as Certificate;
  });
};

export const revokeCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("post", `/OpenVpnServerCerts/RevokeCertificate`, {
    data: {
      vpnServerId,
      commonName,
    },
  });
};

export const addCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("post", `/OpenVpnServerCerts/BuildCertificate`, {
    data: {
      vpnServerId,
      commonName,
    },
  });
};

export const fetchServerSettings = async (vpnServerId: string): Promise<any> => {
  const response = await apiRequest<{ success: boolean; message: string; data: any }>(
    "get",
    `/OpenVpnServerCerts/GetOpenVpnServerCertConf/${vpnServerId}`
  );
  return response.data;
};

export const updateServerSettings = async (settings: any): Promise<void> => {
  return apiRequest<void>("post", "/OpenVpnServerCerts/UpdateServerCertConfig", {
    data: settings,
  });
};

export const fetchDatabasePath = async (): Promise<string> => {
  return apiRequest<string>("get", "/GeoIp/GetDatabasePath");
};

export const fetchOvpnFiles = async (vpnServerId: string): Promise<any[]> => {
  const response = await apiRequest<{ data: any[] }>(
    "get",
    `/OpenVpnFiles/GetAllOvpnFiles/${vpnServerId}`
  );
  return response.data;
};

export const addClientOvpnFile = async (vpnServerId: number, externalId: string, commonName: string, issuedTo: string = "openVpnClient") => {
  return apiRequest<void>("post", "/OpenVpnFiles/AddClientOvpnFile", {
    data: { vpnServerId, externalId, commonName, issuedTo },
  });
};

export const revokeClientOvpnFile = async (  vpnServerId: number,  ovpnFileId: number,  commonName: string) => {
  return apiRequest<void>("post", "/OpenVpnFiles/RevokeClientOvpnFile", {
    data: { vpnServerId, ovpnFileId, commonName },
  });
};

export const getAllApplications = async () => {
  const response = await apiRequest<{ data: any }>("get", `/applications/GetAllApplications`);
  return response.data;
};

export const registerApplication = async (name: string) => {
  const response = await apiRequest<any>("post", "/applications/RegisterApplication", {
    data: { name },
  });

  return response.data;
};

export const revokeApplication = async (clientId: string) => {
  return apiRequest<any>("post", `/applications/RevokeApplication`, {
    data: { clientId },
  });
};

export const downloadClientOvpnFile = async (issuedOvpnFileId: number, vpnServerId: string) => {
  await ensureApiBaseUrl();

  try {
    const response = await apiRequest<any>(
      "post",
      `/OpenVpnFiles/DownloadClientOvpnFile`,
      {
        data: {
          issuedOvpnFileId,
          vpnServerId,
        }
      }
    );

    const apiData = response;

    if (!apiData.success) {
      throw new Error(apiData.message || "Unknown server error");
    }

    const { fileName, content } = apiData.data;

    if (!content) {
      throw new Error("File content is empty.");
    }

    const binaryString = atob(content);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: "application/x-openvpn-profile" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName || `client-${issuedOvpnFileId}.ovpn`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    const message = error?.response?.data?.message || error.message || "Unknown error occurred";
    throw new Error(`Download failed: ${message}`);
  }
};

export const getServer = async (id: string): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServers/GetServer/${id}`);
  return response.data;
};

export const saveServer = async (serverData: any, isEditing: boolean) => {
  const url = isEditing ? "/OpenVpnServers/UpdateServer" : "/OpenVpnServers/AddServer";
  const method: "put" | "post" = isEditing ? "put" : "post";

  return apiRequest<any>(method, url, {
    headers: { "Content-Type": "application/json" },
    data: serverData,
  });
};

export const getOvpnFileConfig = async (VpnServerId: string | number): Promise<any> => {
  if (!VpnServerId) throw new Error("Server ID is required");

  const response = await apiRequest<{ data: any }>(
    "get",
    `/OpenVpnServerOvpnFileConfig/GetOvpnFileConfig/${VpnServerId}`
  );

  return response.data;
};

export const saveOvpnFileConfig = async (configData: any) => {
  if (!configData?.VpnServerId) throw new Error("VPN Server ID is required in configData");

  return apiRequest<any>("post", "/OpenVpnServerOvpnFileConfig/AddOrUpdateOvpnFileConfig", {
    headers: { "Content-Type": "application/json" },
    data: configData,
  });
};

export const getSetting = async (key: string): Promise<{ key: string; value: string }> => {
  if (!key) throw new Error("Setting key is required");

  const response = await apiRequest<{
    success: boolean;
    message: string;
    data: { key: string; value: string };
  }>("get", `/Settings/Get`, { params: { key } });

  if (!response.success) {
    throw new Error(response.message || "Unknown error");
  }

  return response.data;
};

export const setSetting = async (key: string, value: string, type: string) => {
  if (!key || !value || !type) throw new Error("Key, value, and type are required for setting");
  return apiRequest("post", `/Settings/Set`, { params: { key, value, type } });
};

export const getGeoLiteDatabaseVersion = async (): Promise<{ version: string }> => {
  const response = await apiRequest<{ version: string }>("get", "/GeoLite/GetVersionDatabase");
  return response;
};

export const updateGeoLiteDatabase = async (): Promise<any> => {
  return apiRequest<any>("post", "/GeoLite/UpdateDatabase");
};

export const fetchToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const response = await apiRequest<any>("post", "/Auth/token", {
    data: { clientId, clientSecret },
  }, true);

  return response.token;
};

export const setSecret = async (clientId: string, clientSecret: string): Promise<void> => {
  try {
    await apiRequest<void>("post", "/Auth/set-system-secret", {
      data: { clientId, clientSecret },
    }, true);
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error("System application is already set");
    }
    throw error;
  }
};

export const checkSystemStatus = () =>
  apiRequest<{ systemSet: boolean }>("get", "/Auth/system-secret-status", {}, true)
    .then(res => res.systemSet);

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

export const getTelegramBotUsers = async () => {
  const response = await apiRequest<{ data: any }>("get", `/TelegramBotUser/GetAllUsers`);
  return response.data;
};

export const blockUser = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/BlockUser`, {
    data: { telegramId },
  });
};

export const unblockUser = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/UnblockUser`, {
    data: { telegramId },
  });
};

export const setAdmin = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/SetAdmin`, {
    data: { telegramId },
  });
};

export const unsetAdmin = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/UnsetAdmin`, {
    data: { telegramId },
  });
};

export const fetchEvents = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerEvent/GetEventByVpnServerId`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
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

  const resp = await apiRequest<OverviewSeriesResponse>(
    "get",
    `/OpenVpnServerClients/overview/series?${qs.toString()}`
  );

  return (resp as any).data ?? resp;
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

  const resp = await apiRequest<GeoPointAggDto[]>(
    "get",
    `/OpenVpnServerClients/overview/points?${qs.toString()}`
  );

  return (resp as any).data ?? resp;
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

// utils/api.ts
export const fetchOverviewTotals = async (
  params: FetchOverviewTotalsParams
): Promise<OverviewTotalsResponse> => {
  const { from, to, vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const resp = await apiRequest<OverviewTotalsResponse>(
    "get",
    `/OpenVpnServerClients/overview/summary?${qs.toString()}`
  );

  return (resp as any).data ?? resp;
};