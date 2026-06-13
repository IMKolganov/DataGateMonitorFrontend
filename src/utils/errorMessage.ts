import axios from "axios";

/** `message` / string body from an Axios response `data` payload. */
export function axiosResponseDataMessage(data: unknown): string | undefined {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const r = data as Record<string, unknown>;
    for (const k of ["message", "errorMessage", "Message", "error"]) {
      const v = r[k];
      if (typeof v === "string") return v;
    }
  }
  return undefined;
}

/** ProblemDetails-style `Detail` field. */
export function axiosResponseDetail(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    const r = data as Record<string, unknown>;
    const v = r["Detail"] ?? r["detail"];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

const GENERIC_API_ERROR =
  /unexpected error occurred|please try again later|internal server error/i;

/** Prefer `detail` when `message` is a generic wrapper (ASP.NET global exception middleware). */
export function formatApiErrorPayload(data: unknown): string | undefined {
  const message = axiosResponseDataMessage(data)?.trim();
  const detail = axiosResponseDetail(data);

  if (detail && (!message || GENERIC_API_ERROR.test(message))) {
    return detail;
  }
  if (message && detail && message !== detail) {
    return `${message} (${detail})`;
  }
  return message ?? detail;
}

/** Safe message from thrown/rejected values (catch blocks, mutation errors). */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const formatted = formatApiErrorPayload(err.response?.data);
    if (formatted) return formatted;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}
