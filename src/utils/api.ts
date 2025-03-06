import axios from "axios";
import { OpenVpnServerInfoResponse, Config, Certificate, IssuedOvpnFile } from "./types";

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

export const fetchConfig = async (): Promise<Config> => {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const response = await fetch("/config.json");
      const config: Config = await response.json();

      if (!config.apiBaseUrl || !config.wsBaseUrl) {
        throw new Error("Invalid API or WebSocket base URL in config");
      }

      API_BASE_URL = config.apiBaseUrl;
      WS_BASE_URL = config.wsBaseUrl;

      return config;
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

  return `${WS_BASE_URL}/api/openvpn/ws/${vpnServerId}`;
};

export const getWebSocketUrlForBackgroundService = async (): Promise<string> => {
  await ensureApiBaseUrl();
  if (!WS_BASE_URL) throw new Error("WebSocket base URL is not set");

  return `${WS_BASE_URL}/api/OpenVpnServers/status-stream`;
};

export const runServiceNow = async (): Promise<void> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  try {
    const response = await axios.post(`${API_BASE_URL}/OpenVpnServers/run-now`);
  } catch (error) {
    console.error("Failed to start service:", error);
    throw error;
  }
};

export const fetchServers = async (): Promise<OpenVpnServerInfoResponse[]> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllServers`);
  return response.data;
};

export const fetchServersWithStats = async (id: string): Promise<any> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetServerWithStats/${id}`);
  return response.data;
};

export const fetchConnectedClients = async (id: string, page: number, pageSize: number): Promise<any> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllConnectedClients/${id}`, {
    params: { page, pageSize },
  });
  return response.data;
};

export const fetchHistoryClients = async (id: string, page: number, pageSize: number): Promise<any> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllHistoryClients/${id}`, {
    params: { page, pageSize },
  });
  return response.data;
};

export const deleteServer = async (id: number) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  await axios.delete(`${API_BASE_URL}/OpenVpnServers/DeleteServer?vpnServerId=${id}`);
};

export const fetchCertificates = async (vpnServerId: string, status?: string): Promise<Certificate[]> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const url = status
    ? `${API_BASE_URL}/OpenVpnServerCerts/GetAllVpnServerCertificatesByStatus/${vpnServerId}?certificateStatus=${status}`
    : `${API_BASE_URL}/OpenVpnServerCerts/GetAllVpnServerCertificates/${vpnServerId}`;
  const response = await axios.get<Certificate[]>(url);
  return response.data;
};

export const revokeCertificate = async (vpnServerId: string, commonName: string) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  await axios.post(`${API_BASE_URL}/OpenVpnServerCerts/RevokeServerCertificate`, {
    vpnServerId,
    cnName: commonName
  });
};

export const addCertificate = async (vpnServerId: string, commonName: string) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  await axios.get(`${API_BASE_URL}/OpenVpnServerCerts/AddServerCertificate/${vpnServerId}?cnName=${commonName}`);
};

export const fetchServerSettings = async (vpnServerId: string): Promise<any> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  const response = await axios.get(`${API_BASE_URL}/OpenVpnServerCerts/GetOpenVpnServerCertConf/${vpnServerId}`);
  return response.data;
};

export const updateServerSettings = async (settings: any): Promise<void> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  await axios.post(`${API_BASE_URL}/OpenVpnServerCerts/UpdateServerCertConfig`, settings);
};

export const fetchDatabasePath = async (): Promise<string> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  const response = await axios.get(`${API_BASE_URL}/GeoIp/GetDatabasePath`);
  return response.data;
};

export const fetchOvpnFiles = async (vpnServerId: string): Promise<IssuedOvpnFile[]> => {
  await ensureApiBaseUrl();
  const response = await axios.get(`${API_BASE_URL}/OpenVpnFiles/GetAllOvpnFiles?vpnServerId=${vpnServerId}`);
  return response.data;
};

export const addOvpnFile = async (vpnServerId: number, externalId: string, commonName: string, issuedTo: string = "openVpnClient") => {
  await ensureApiBaseUrl();
  await axios.post(`${API_BASE_URL}/OpenVpnFiles/AddOvpnFile`, {
    vpnServerId,
    externalId,
    commonName,
    issuedTo,
  });
};

export const revokeOvpnFile = async (vpnServerId: string, externalId: string) => {
  await ensureApiBaseUrl();
  await axios.post(`${API_BASE_URL}/OpenVpnFiles/RevokeOvpnFile`, {
    vpnServerId,
    externalId,
  });
};

export const getAllApplications = async () => {
  await ensureApiBaseUrl();
  try {
    const response = await axios.get(`${API_BASE_URL}/applications/GetAllApplications`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    throw error;
  }
};

export const registerApplication = async (name: string) => {
  await ensureApiBaseUrl();
  try {
    const response = await axios.post(`${API_BASE_URL}/applications/RegisterApplication`, { name });
    return response.data;
  } catch (error) {
    console.error("Failed to register application:", error);
    throw error;
  }
};

export const revokeApplication = async (clientId: string) => {
  await ensureApiBaseUrl();
  try {
    const response = await axios.post(`${API_BASE_URL}/applications/RevokeApplication/${clientId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to revoke application:", error);
    throw error;
  }
};

export const downloadOvpnFile = async (issuedOvpnFileId: number, vpnServerId: string) => {
  await ensureApiBaseUrl();
  
  const response = await axios.get(
    `${API_BASE_URL}/OpenVpnFiles/DownloadOvpnFile/${issuedOvpnFileId}/${vpnServerId}`,
    { responseType: "blob" }
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

export const getServer = async (serverId: string) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetServer/${serverId}`);
  return response.data;
};

export const saveServer = async (serverData: any, isEditing: boolean) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");

  const url = isEditing
    ? `${API_BASE_URL}/OpenVpnServers/UpdateServer`
    : `${API_BASE_URL}/OpenVpnServers/AddServer`;
  const method = isEditing ? "POST" : "PUT";

  const response = await axios({
    method,
    url,
    headers: { "Content-Type": "application/json" },
    data: serverData,
  });

  return response.data;
};

export const getOvpnFileConfig = async (serverId: string | number) => {
  await ensureApiBaseUrl();
  if (!serverId) throw new Error("Server ID is required");

  const response = await axios.get(`${API_BASE_URL}/OpenVpnServerOvpnFileConfig/GetOvpnFileConfig/${serverId}`);

  return response.data;
};

export const saveOvpnFileConfig = async (configData: any) => {
  await ensureApiBaseUrl();
  if (!configData?.ServerId) throw new Error("VPN Server ID is required in configData");

  const url = `${API_BASE_URL}/OpenVpnServerOvpnFileConfig/AddOrUpdateOvpnFileConfig`;

  const response = await axios.post(url, configData, {
    headers: { "Content-Type": "application/json" },
  });

  return response.data;
};

export const getSetting = async (key: string) => {
  await ensureApiBaseUrl();
  if (!key) throw new Error("Setting key is required");

  const response = await axios.get(`${API_BASE_URL}/Settings/Get`, { params: { key } });
  return response.data;
};

export const setSetting = async (key: string, value: string, type: string) => {
  await ensureApiBaseUrl();
  if (!key || !value || !type) throw new Error("Key, value, and type are required for setting");

  const response = await axios.post(`${API_BASE_URL}/Settings/Set`, null, {
    params: { key, value, type },
  });

  return response.data;
};

export const getGeoLiteDatabaseVersion = async () => {
  await ensureApiBaseUrl();
  try {
    const response = await axios.get(`${API_BASE_URL}/GeoLite/GetVersionDatabase`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch GeoLite database version:", error);
    throw error;
  }
};

export const updateGeoLiteDatabase = async () => {
  await ensureApiBaseUrl();
  try {
    const response = await axios.post(`${API_BASE_URL}/GeoLite/UpdateDatabase`);
    return response.data;
  } catch (error) {
    console.error("Failed to update GeoLite database:", error);
    throw error;
  }
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