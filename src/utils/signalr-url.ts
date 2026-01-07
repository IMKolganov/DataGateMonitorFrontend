// src/utils/signalr-url.ts
import { getApiBaseUrl } from "../config/apiBase";
import { logout } from "../api/apirequest";
import {ACCESS_TOKEN_KEY} from "./const.ts";

export const getSignalRUrl = (vpnServerId: string): string => {
  if (!vpnServerId) throw new Error("vpnServerId is required");
  return `${getApiBaseUrl()}/hubs/frontend?serverId=${encodeURIComponent(vpnServerId)}`;
};

export const getAccessTokenOrLogout = (): string => {
  const t = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!t) {
    logout?.();
    throw new Error("User is not authenticated");
  }
  return t;
};
