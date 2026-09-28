import {
  logout,
  refreshSessionTokens,
  shouldLogoutOnRefreshError,
} from "../../api/apirequest";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";
import { startAdminIdleSession } from "./adminIdleSession";
import { startAuthCrossTabSync } from "./authCrossTab";
import { authErrFields, authLog } from "./authLog";
import { scheduleAutoLogout } from "./tokenExpiryScheduler";

/**
 * Restores JWT expiry refresh and admin idle timers after a full page load.
 * If access is missing but refresh remains, attempts a silent refresh (F5 / cleared access).
 */
export function restoreAuthSessionOnStartup(): () => void {
  let stopped = false;
  let stopIdle: (() => void) | undefined;
  const stopCrossTab = startAuthCrossTabSync();

  const armSession = (accessToken: string) => {
    if (stopped) return;
    if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
      scheduleAutoLogout(accessToken);
    }
    stopIdle?.();
    stopIdle = startAdminIdleSession();
  };

  const access = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (access) {
    armSession(access);
  } else if (refresh) {
    authLog("restoreAuthSessionOnStartup: access missing, attempting silent refresh");
    void refreshSessionTokens()
      .then((token) => {
        authLog("restoreAuthSessionOnStartup: silent refresh OK");
        armSession(token);
      })
      .catch((err) => {
        if (stopped) return;
        authLog("restoreAuthSessionOnStartup: silent refresh failed", authErrFields(err));
        if (shouldLogoutOnRefreshError(err)) {
          logout("refreshRejected");
        }
      });
  }

  return () => {
    stopped = true;
    stopIdle?.();
    stopCrossTab();
  };
}
