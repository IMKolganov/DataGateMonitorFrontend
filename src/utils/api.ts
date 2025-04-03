import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { Config, Certificate, IssuedOvpnFile } from "./types";

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

const apiRequest = async <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  config: AxiosRequestConfig = {}
): Promise<T> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem("token");
  if (!token) {
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
        Authorization: `Bearer ${token}`,
      },
    });

    return config.responseType === "blob" ? (response as any) : response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
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

export const getWebSocketUrl = async (vpnServerId: string): Promise<string> => {
  await ensureApiBaseUrl();
  if (!WS_BASE_URL) throw new Error("WebSocket base URL is not set");

  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  return `${WS_BASE_URL}/openvpn/ws/${vpnServerId}?access_token=${encodeURIComponent(token)}`;
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
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServers/GetAllConnectedClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const fetchHistoryClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {

  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServers/GetAllHistoryClients`, {
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
    ? `/OpenVpnServerCerts/GetAllVpnServerCertificatesByStatus/${vpnServerId}`
    : `/OpenVpnServerCerts/GetAllVpnServerCertificates/${vpnServerId}`;

  const response = await apiRequest<{
    success: boolean;
    message: string;
    data: any[];
  }>("get", endpoint, {
    params: status ? { certificateStatus: status } : {},
  });

  return response.data.map((raw) => {
    const status = raw.status ?? (raw.isRevoked ? 1 : 0);
    return {
      ...raw,
      status,
      expiryDate: raw.expiryDate ?? null,
      revokeDate: raw.revokeDate ?? null,
      serialNumber: raw.serialNumber ?? "",
    } as Certificate;
  });
};
export const revokeCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("post", `/OpenVpnServerCerts/RevokeServerCertificate`, {
    data: { vpnServerId, cnName: commonName },
  });
};

export const addCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("get", `/OpenVpnServerCerts/AddServerCertificate/${vpnServerId}`, {
    params: { cnName: commonName },
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

export const addOvpnFile = async (vpnServerId: number, externalId: string, commonName: string, issuedTo: string = "openVpnClient") => {
  return apiRequest<void>("post", "/OpenVpnFiles/AddOvpnFile", {
    data: { vpnServerId, externalId, commonName, issuedTo },
  });
};

export const revokeOvpnFile = async (vpnServerId: string, externalId: string) => {
  return apiRequest<void>("post", "/OpenVpnFiles/RevokeOvpnFile", {
    data: { vpnServerId, externalId },
  });
};

export const getAllApplications = async () => {
  const response = await apiRequest<{ data: any }>("get", `/applications/GetAllApplications`);
  return response.data;
};

export const registerApplication = async (name: string) => {
  return apiRequest<any>("post", "/applications/RegisterApplication", {
    data: { name },
  });
};

export const revokeApplication = async (clientId: string) => {
  return apiRequest<any>("post", `/applications/RevokeApplication/${clientId}`);
};

export const downloadOvpnFile = async (issuedOvpnFileId: number, vpnServerId: string) => {
  await ensureApiBaseUrl();

  const response = await apiRequest<AxiosResponse<Blob>>(
    "get",
    `/OpenVpnFiles/DownloadOvpnFile/${issuedOvpnFileId}/${vpnServerId}`,
    {
      responseType: "blob",
    }
  );

  const contentDisposition = response.headers["content-disposition"];
  let filename = `client-${issuedOvpnFileId}.ovpn`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;"']+)/);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  const blob = new Blob([response.data], { type: "application/x-openvpn-profile" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getServer = async (serverId: string): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServers/GetServer/${serverId}`);
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

export const getOvpnFileConfig = async (VpnServerId: string | number) => {
  if (!VpnServerId) throw new Error("Server ID is required");

  return apiRequest<any>("get", `/OpenVpnServerOvpnFileConfig/GetOvpnFileConfig/${VpnServerId}`);
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

export const getGeoLiteDatabaseVersion = async (): Promise<any> => {
  return apiRequest<any>("get", "/GeoLite/GetVersionDatabase");
};

export const updateGeoLiteDatabase = async (): Promise<any> => {
  return apiRequest<any>("post", "/GeoLite/UpdateDatabase");
};

export const fetchToken = async (clientId: string, clientSecret: string): Promise<string> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  try {
    const response = await axios.post(`${API_BASE_URL}/Auth/token`, {
      clientId,
      clientSecret,
    });

    return response.data.token;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error("System application not found");
    }
    throw error;
  }
};

export const setSecret = async (clientId: string, clientSecret: string): Promise<void> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  try {
    await axios.post(`${API_BASE_URL}/Auth/set-system-secret`, { clientId, clientSecret });
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      throw new Error("System application is already set");
    }
    throw error;
  }
};

export const checkSystemStatus = async (): Promise<boolean> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  try {
    const response = await axios.get(`${API_BASE_URL}/Auth/system-secret-status`);
    return response.data.systemSet;
  } catch (error) {
    console.error("Failed to check system status:", error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};