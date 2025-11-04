// src/config/apiBase.ts
export function getApiBaseUrl(): string {
  const raw = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  const base = (raw ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("VITE_API_BASE_URL is not set. Add it to your .env (e.g. VITE_API_BASE_URL=https://api.example.com)");
  }
  return base;
}
