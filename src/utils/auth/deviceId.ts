import { DEVICE_ID_KEY } from "../const";

/** Returns a stable per-browser id, creating one on first use. */
export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)?.trim();
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
