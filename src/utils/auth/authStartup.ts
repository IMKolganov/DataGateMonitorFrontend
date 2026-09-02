import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";
import { startAdminIdleSession } from "./adminIdleSession";
import { scheduleAutoLogout } from "./tokenExpiryScheduler";

/**
 * Restores JWT expiry refresh and admin idle timers after a full page load.
 * Access token alone is enough for idle tracking; refresh token is required only for silent JWT renewal.
 */
export function restoreAuthSessionOnStartup(): () => void {
  const access = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!access) return () => {};

  if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
    scheduleAutoLogout(access);
  }

  return startAdminIdleSession();
}
