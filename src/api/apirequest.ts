// api/apirequest.ts
import axios from "axios";
import type { AxiosRequestConfig } from "axios";

export interface Config {
  defaultRefreshInterval: number;
}

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
    softLogout(); // мягкий логаут (без петли)
    throw new Error("User is not authenticated");
  }

  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      ...config,
      headers: {
        ...config.headers,
        ...(skipAuth ? {} : { Authorization: `Bearer ${token}` }),
      },
    });

    return response.data as ApiResponse<T>;
  } catch (error: any) {
    const status = error?.response?.status;
    const pathname = window.location.pathname;

    // Do not redirect on 401 when:
    // 1) skipAuth is true (public call),
    // 2) it's an auth endpoint (login/secret/status),
    // 3) we're already on /login (avoid reload loop)
    if (
      status === 401 &&
      !skipAuth &&
      !isAuthEndpoint(url) &&
      pathname !== "/login"
    ) {
      logout(); // safe redirect to /login if not already there
      // Note: no return here, we still rethrow so callers see the error if needed
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
        apiBaseUrl: API_BASE_URL,
      };
    } catch (error) {
      console.error("Failed to load config:", error);
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

// Soft logout: clear token and navigate only if not on /login
export const logout = () => {
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") {
    // Use assign to avoid keeping the previous page in history
    window.location.assign("/login");
  }
};

// Used when we only need to clear token without forcing navigation on /login
const softLogout = () => {
  localStorage.removeItem("token");
  // If we are not on login, go there; if already there, do nothing
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};
