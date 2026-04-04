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
    if (typeof v === "string") return v;
  }
  return undefined;
}

/** Safe message from thrown/rejected values (catch blocks, mutation errors). */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const fromData = axiosResponseDataMessage(err.response?.data);
    if (fromData) return fromData;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}
