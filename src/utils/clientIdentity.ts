import axios from "axios";
import { appVersion } from "../version";

/**
 * Backend rejects every request without these (rules: DataGateMonitor.SharedModels `ClientIdentityRules`).
 * Browser WebSockets cannot send headers, so SignalR hub URLs carry the same values as query parameters.
 */
export const CLIENT_NAME_HEADER = "X-Client-Name";
export const CLIENT_VERSION_HEADER = "X-Client-Version";
export const CLIENT_NAME_QUERY = "clientName";
export const CLIENT_VERSION_QUERY = "clientVersion";
export const CLIENT_NAME = "frontend";

export function installClientIdentityHeaders(): void {
  axios.defaults.headers.common[CLIENT_NAME_HEADER] = CLIENT_NAME;
  axios.defaults.headers.common[CLIENT_VERSION_HEADER] = appVersion;
}

export function withClientIdentityQuery(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return (
    `${url}${separator}${CLIENT_NAME_QUERY}=${encodeURIComponent(CLIENT_NAME)}` +
    `&${CLIENT_VERSION_QUERY}=${encodeURIComponent(appVersion)}`
  );
}
