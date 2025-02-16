import axios from "axios";
import { OpenVpnServerInfoResponse, Config, Certificate } from "./types";

let API_BASE_URL: string | null = null;

let configPromise: Promise<Config> | null = null;

export const fetchConfig = async (): Promise<Config> => {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      const response = await fetch("/config.json");
      const config: Config = await response.json();
      if (!config.apiBaseUrl) throw new Error("Invalid API base URL in config");
      API_BASE_URL = config.apiBaseUrl;
      return config;
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  })();

  return configPromise;
};

const ensureApiBaseUrl = async () => {
  if (!API_BASE_URL) {
    await fetchConfig();
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

export const fetchConnectedClients = async (id: string): Promise<any[]> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllConnectedClients/${id}`);
  return response.data;
};

export const fetchHistoryClients = async (id: string): Promise<any[]> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllHistoryClients/${id}`);
  return response.data;
};

export const deleteServer = async (id: number) => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  await axios.delete(`${API_BASE_URL}/OpenVpnServers/DeleteServer?vpnServerId=${id}`);
};

export const runServiceNow = async (): Promise<void> => {
  await ensureApiBaseUrl();
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  await axios.post(`${API_BASE_URL}/run-now`);
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
