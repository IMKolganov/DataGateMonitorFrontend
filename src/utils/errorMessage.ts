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

/** Provider / SQL text that must never be shown as the primary UI error. */
const TECHNICAL_DB_DETAIL =
  /SQLSTATE|violates unique constraint|duplicate key value|IX_[A-Za-z0-9_]+/i;

function humanizeTechnicalConflict(detail: string, message?: string): string {
  if (/IX_VpnServers_ServerName/i.test(detail)) {
    return "A VPN server with the same name already exists.";
  }
  if (message && !TECHNICAL_DB_DETAIL.test(message) && !GENERIC_API_ERROR.test(message)) {
    return message;
  }
  if (/already exists with the same key/i.test(message ?? "")) {
    return "A resource with these values already exists. Change the unique fields and try again.";
  }
  return "A resource with these values already exists. Change the unique fields and try again.";
}

/** Prefer `detail` when `message` is a generic wrapper (ASP.NET global exception middleware). */
export function formatApiErrorPayload(data: unknown): string | undefined {
  const message = axiosResponseDataMessage(data)?.trim();
  const detail = axiosResponseDetail(data);

  if (detail && TECHNICAL_DB_DETAIL.test(detail)) {
    return humanizeTechnicalConflict(detail, message);
  }

  if (detail && (!message || GENERIC_API_ERROR.test(message))) {
    return detail;
  }
  if (message && detail && message !== detail) {
    // Prefer the short message when detail only repeats it with extra noise.
    if (detail.startsWith(message)) return message;
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
