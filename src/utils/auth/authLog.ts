import axios from "axios";

/**
 * Verbose auth tracing: enabled in dev, or after
 * `localStorage.setItem('DEBUG_AUTH','1')` + page reload.
 */
export function authDebugEnabled(): boolean {
  try {
    if (import.meta.env.DEV) return true;
    return typeof localStorage !== "undefined" && localStorage.getItem("DEBUG_AUTH") === "1";
  } catch {
    return Boolean(import.meta.env.DEV);
  }
}

export function authErrFields(err: unknown): Record<string, unknown> {
  if (axios.isAxiosError(err)) {
    return {
      message: err.message,
      code: err.code,
      httpStatus: err.response?.status,
      responseData: err.response?.data,
    };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { detail: err };
}

export function authLog(message: string, extra?: Record<string, unknown>): void {
  if (!authDebugEnabled()) return;
  if (extra && Object.keys(extra).length > 0) {
    console.debug(`[ogm-auth] ${message}`, extra);
  } else {
    console.debug(`[ogm-auth] ${message}`);
  }
}
