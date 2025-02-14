import axios from "axios";
import { OpenVpnServerInfoResponse, Config } from "./types";

let API_BASE_URL: string | null = null;

// Загружаем конфиг только один раз и сохраняем Promise
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
