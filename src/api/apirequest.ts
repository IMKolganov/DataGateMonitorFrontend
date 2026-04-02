// api/apirequest.ts
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRATION,
  REFRESH_TOKEN_KEY,
} from "../utils/const.ts";
import { notifyAccessTokenRefreshed } from "../utils/auth/accessTokenEvents.ts";
import type { RefreshRequest, RefreshResponse } from "./orval/model";

let refreshPromise: Promise<string> | null = null;

/** Only these refresh failures should end the browser session (logout). */
function shouldLogoutOnRefreshError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string; response?: { status?: number } };
  if (e.message === "No refresh token") return true;
  if (e.name === "RefreshAuthFailure") return true;
  const st = e.response?.status;
  return st === 401 || st === 403;
}

export interface Config {
  defaultRefreshInterval: number;
  apiBaseUrl?: string;
}

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  errorMessage?: string | null;
};

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

// Helper: detect auth endpoints to avoid redirect loops
const isAuthEndpoint = (u: string) => /\/api\/auth(\/|$)/i.test(u);

export const apiRequest = async <T>(
    method: "get" | "post" | "put" | "delete" | "patch",
    url: string,
    config: AxiosRequestConfig = {},
    skipAuth: boolean = false,
): Promise<ApiResponse<T>> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  // If token is required but missing -> soft logout (no reload loop)
  if (!token && !skipAuth && !isAuthEndpoint(url)) {
    softLogout();
    throw new Error("User is not authenticated");
  }

  // Build headers safely: add Authorization only if token exists AND not skipAuth
  const authHeader = !skipAuth && token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      ...config,
      headers: {
        ...config.headers,
        ...authHeader,
      },
    });

    return response.data as ApiResponse<T>;
  } catch (error: any) {
    const status = error?.response?.status;
    const pathname = window.location.pathname;

    const shouldTryRefresh =
        status === 401 &&
        !skipAuth &&
        !isAuthEndpoint(url) &&
        pathname !== "/login";

    if (shouldTryRefresh) {
      try {
        const newToken = await getOrCreateRefresh();

        // Reschedule JWT expiry timer (avoids stale timer if login ever stays in SPA without full reload)
        void import("../utils/auth/authSession").then(({ scheduleAutoLogout }) => {
          scheduleAutoLogout(newToken);
        });

        const retryResponse = await axios({
          method,
          url: `${API_BASE_URL}${url}`,
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });

        return retryResponse.data as ApiResponse<T>;
      } catch (refreshErr) {
        if (shouldLogoutOnRefreshError(refreshErr)) {
          logout();
        }
        throw error;
      }
    }

    throw error;
  }
};

export const fetchConfig = async (): Promise<Config> => {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const response = await fetch("/config.json");
    const cfg: Config = await response.json();

    const origin = window.location.origin;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    // Prefer config value if present, otherwise fall back to origin
    API_BASE_URL = cfg.apiBaseUrl ?? origin;
    WS_BASE_URL = `${protocol}//${host}`;

    return {
      ...cfg,
      apiBaseUrl: API_BASE_URL ?? undefined,
    };
  })();

  return configPromise;
};

export const ensureApiBaseUrl = async () => {
  if (!API_BASE_URL || !WS_BASE_URL) {
    await fetchConfig();
  }
};

export const logout = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRATION);

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const softLogout = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRATION);

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

export const getWebSocketUrlForBackgroundService = async (): Promise<string> => {
  await ensureApiBaseUrl();
  if (!WS_BASE_URL) throw new Error("WebSocket base URL is not set");

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  return `${WS_BASE_URL}/api/open-vpn-servers/status-stream?access_token=${encodeURIComponent(
      token,
  )}`;
};

const refreshAccessToken = async (): Promise<string> => {
  await ensureApiBaseUrl();

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const body: RefreshRequest = {
    refreshToken,
    userAgent: navigator.userAgent,
    // deviceId: localStorage.getItem("deviceId") ?? null,
  };

  // IMPORTANT: raw axios call (do not call apiRequest / ogmMutator here)
  const resp = await axios.post<ApiResponse<RefreshResponse>>(
      `${API_BASE_URL}/api/auth/refresh`,
      body,
      { headers: { "Content-Type": "application/json" } },
  );

  const payload = resp.data;
  const data = payload?.data;

  const newAccess = data?.token;
  if (!payload?.success || !newAccess) {
    const e = new Error(payload?.errorMessage ?? "Refresh failed");
    e.name = "RefreshAuthFailure";
    throw e;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, newAccess);

  const newRefresh = data?.refreshToken;
  if (newRefresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
  }

  const newRefreshExp = data?.refreshExpiration;
  if (newRefreshExp) {
    localStorage.setItem(REFRESH_TOKEN_EXPIRATION, newRefreshExp);
  }

  notifyAccessTokenRefreshed();
  return newAccess;
};

// Ensures only one refresh in parallel
const getOrCreateRefresh = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

/** Single-flight refresh (same promise if multiple callers during 401). Safe when access JWT expired but refresh token still valid. */
export const refreshSessionTokens = (): Promise<string> => getOrCreateRefresh();