// api/apirequest.ts
import axios from "axios";
import type { AxiosRequestConfig } from "axios";

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
  skipAuth: boolean = false
): Promise<ApiResponse<T>> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem("token");

  // If token is required but missing -> soft logout (no reload loop)
  if (!token && !skipAuth && !isAuthEndpoint(url)) {
    softLogout();
    throw new Error("User is not authenticated");
  }

  // Build headers safely: add Authorization only if token exists AND not skipAuth
  const authHeader =
    !skipAuth && token ? { Authorization: `Bearer ${token}` } : {};

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

    if (
      status === 401 &&
      !skipAuth &&
      !isAuthEndpoint(url) &&
      pathname !== "/login"
    ) {
      logout();
    }

    throw error;
  }
};

export const fetchConfig = async (): Promise<Config> => {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
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
    } catch (error) {
      throw error;
    }
  })();

  return configPromise;
};

export const ensureApiBaseUrl = async () => {
  if (!API_BASE_URL || !WS_BASE_URL) {
    await fetchConfig();
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const softLogout = () => {
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

export const getWebSocketUrlForBackgroundService = async (): Promise<string> => {
  await ensureApiBaseUrl();
  if (!WS_BASE_URL) throw new Error("WebSocket base URL is not set");

  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    throw new Error("User is not authenticated");
  }

  return `${WS_BASE_URL}/api/open-vpn-servers/status-stream?access_token=${encodeURIComponent(token)}`;
};