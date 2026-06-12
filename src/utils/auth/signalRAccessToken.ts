import { refreshSessionTokens } from "../../api/apirequest";
import { ACCESS_TOKEN_KEY } from "../const";
import { getTokenExpiration } from "./jwt";

/** Refresh the access JWT when it expires within this window (SignalR negotiate / reconnect). */
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

/**
 * Returns a valid access token for SignalR hubs, refreshing via refresh token when the JWT is expired or near expiry.
 */
export async function resolveHubAccessToken(): Promise<string> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return "";

  try {
    const { expiresInMs } = getTokenExpiration(token);
    if (expiresInMs > REFRESH_BEFORE_EXPIRY_MS) return token;
    return await refreshSessionTokens();
  } catch {
    return token;
  }
}
