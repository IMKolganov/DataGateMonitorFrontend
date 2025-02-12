import axios from "axios";
import { OpenVpnServerInfoResponse, Config } from "./types";

let API_BASE_URL = "";

export const fetchConfig = async (): Promise<Config> => {
  try {
    const response = await fetch("/config.json");
    const config: Config = await response.json();
    API_BASE_URL = config.apiBaseUrl; // Обновляем глобальную переменную
    return config;
  } catch (error) {
    console.error("Failed to load config:", error);
    throw error;
  }
};

// Грузим конфиг при старте
fetchConfig();

export const fetchServers = async (): Promise<OpenVpnServerInfoResponse[]> => {
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  const response = await axios.get(`${API_BASE_URL}/OpenVpnServers/GetAllServers`);
  return response.data;
};

export const deleteServer = async (id: number) => {
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  await axios.delete(`${API_BASE_URL}/OpenVpnServers/DeleteServer?vpnServerId=${id}`);
};

export const runServiceNow = async (): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API base URL is not set");
  await axios.post(`${API_BASE_URL}/run-now`);
};
