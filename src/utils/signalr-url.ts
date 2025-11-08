// src/utils/signalr-url.ts
import { getApiBaseUrl } from "../config/apiBase";
import { logout } from "../api/apirequest";

export const getSignalRUrl = (vpnServerId: string): string => {
  if (!vpnServerId) throw new Error("vpnServerId is required");
  return `${getApiBaseUrl()}/hubs/frontend?serverId=${encodeURIComponent(vpnServerId)}`;
};

export const getAccessTokenOrLogout = (): string => {
  const t = localStorage.getItem("token");
  if (!t) {
    logout?.();
    throw new Error("User is not authenticated");
  }
  return t;
};
