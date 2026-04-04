// api/orval/mutator.ts — adapter for Orval 8 + custom axios apiRequest (ApiResponse wrapper)
import type { AxiosRequestConfig } from "axios";
import { apiRequest, type ApiResponse } from "./apirequest";

type LowerHttpMethod = "get" | "head" | "post" | "put" | "delete" | "patch";

function flattenHeaders(
  h: HeadersInit | Record<string, string> | undefined | null,
): Record<string, string> | undefined {
  if (h == null) return undefined;
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(h)) {
    const o: Record<string, string> = {};
    for (const [k, v] of h) o[k] = v;
    return o;
  }
  return h as Record<string, string>;
}

/**
 * Orval 8 passes RequestInit-style options (body, headers, signal, …).
 * We unwrap the backend `ApiResponse<T>` envelope and return the inner payload.
 * Return type is asserted to T so generated clients match runtime (unwrapped data).
 */
export async function ogmMutator<T = unknown>(
  configOrUrl: Record<string, unknown> | string,
  options?: Record<string, unknown>,
): Promise<T> {
  const merged: Record<string, unknown> =
    typeof configOrUrl === "string"
      ? { url: configOrUrl, ...(options ?? {}) }
      : { ...configOrUrl, ...(options ?? {}) };

  const url = merged.url as string;
  const methodLower = String(merged.method ?? "get").toLowerCase();
  const method = methodLower as LowerHttpMethod;

  const rawBody = merged.data ?? merged.body;
  const headers = flattenHeaders(merged.headers as HeadersInit | undefined);
  const params = merged.params as Record<string, unknown> | undefined;
  const signal = merged.signal as AbortSignal | undefined;

  const axiosConfig: AxiosRequestConfig = {
    params,
    signal,
  };

  if (headers && Object.keys(headers).length > 0) {
    axiosConfig.headers = headers;
  }

  if (rawBody !== undefined && rawBody !== null && methodLower !== "get" && methodLower !== "head") {
    axiosConfig.data = rawBody;
  }

  const res = await apiRequest<unknown>(method, url, axiosConfig);

  const inner =
    res && typeof res === "object" && "data" in res && "success" in (res as object)
      ? (res as ApiResponse<unknown>).data
      : (res as unknown);

  return inner as T;
}
