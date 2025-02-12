import axios from "axios";
import { OpenVpnServerInfoResponse, Config } from "./types";

let API_BASE_URL = "";

const loadConfig = async () => {
  try {
    const response = await fetch("/config.json");
    const config: Config = await response.json();
    API_BASE_URL = config.apiBaseUrl;
  } catch (error) {
    console.error("Failed to load config:", error);
  }
};

loadConfig();

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
  await axios.post(`${API_BASE_URL}/run-now`);
};
