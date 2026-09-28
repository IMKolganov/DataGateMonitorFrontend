import { logout, isLoginRedirectInProgress } from "../../api/apirequest";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";
import { authLog } from "./authLog";

/**
 * When another tab clears auth storage (logout / forced sign-out), end this tab's
 * session too. `storage` events fire only in *other* documents, not the writer.
 */
export function startAuthCrossTabSync(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (
      event.key !== null &&
      event.key !== ACCESS_TOKEN_KEY &&
      event.key !== REFRESH_TOKEN_KEY
    ) {
      return;
    }

    const access = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (access) return;
    // Access-only clear is recoverable (silent refresh / other tab mid-refresh).
    // Full logout clears refresh too — only then end this tab's session.
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refresh) return;
    if (isLoginRedirectInProgress()) return;
    if (window.location.pathname === "/login") return;

    authLog("crossTab: auth tokens cleared in another tab — signing out");
    logout("loggedOutElsewhere");
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
