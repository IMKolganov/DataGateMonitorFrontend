//api/apirequest.ts
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type { Config } from "../utils/types";
import type { ApiResponse } from "../utils/api-response";

let API_BASE_URL: string | null = null;
let WS_BASE_URL: string | null = null;
let configPromise: Promise<Config> | null = null;

export const apiRequest = async <T>(
  method: "get" | "post" | "put" | "delete" | "patch",
  url: string,
  config: AxiosRequestConfig = {},
  skipAuth: boolean = false
): Promise<ApiResponse<T>> => {
  await ensureApiBaseUrl();

  const token = localStorage.getItem("token");
  if (!token && !skipAuth) {
    logout();
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

    // blob responses should be handled by dedicated endpoints; if you still have them, keep a branch here
    return response.data as ApiResponse<T>;
  } catch (error: any) {
    if (!skipAuth && error.response?.status === 401) {
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
      const config: Config = await response.json();

      const origin = window.location.origin;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;

      API_BASE_URL = `${origin}/api`;
      WS_BASE_URL = `${protocol}//${host}/api`;

      return {
        ...config,
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


export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};