import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_EXPIRATION, REFRESH_TOKEN_KEY } from "../const";
import { scheduleAutoLogout } from "./tokenExpiryScheduler";

export type AuthTokenPayload = {
  token?: string | null;
  refreshToken?: string | null;
  refreshExpiration?: string | null;
};

export function storeAuthTokens(payload: AuthTokenPayload): void {
  const token = payload.token;
  if (!token) {
    throw new Error("No token returned by API.");
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (payload.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  }
  if (payload.refreshExpiration) {
    localStorage.setItem(REFRESH_TOKEN_EXPIRATION, payload.refreshExpiration);
  }
  scheduleAutoLogout(token);
}
