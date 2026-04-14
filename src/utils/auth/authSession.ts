import { logout, refreshSessionTokens, shouldLogoutOnRefreshError } from "../../api/apirequest";
import { authErrFields, authLog } from "./authLog";
import { getTokenExpiration } from "./jwt";

let logoutTimer: number | null = null;

async function refreshOrLogout(): Promise<void> {
    try {
        authLog("refreshOrLogout: requesting new access token (timer or expired JWT)");
        const newToken = await refreshSessionTokens();
        const { expiresInMs } = getTokenExpiration(newToken);
        if (expiresInMs <= 0) {
            authLog("refreshOrLogout: new token already expired per JWT exp — logging out");
            logout();
            return;
        }
        scheduleAutoLogout(newToken);
        authLog("refreshOrLogout: success, rescheduled logout timer");
    } catch (err) {
        if (shouldLogoutOnRefreshError(err)) {
            authLog("refreshOrLogout: refresh rejected — logging out", authErrFields(err));
            logout();
        } else {
            authLog("refreshOrLogout: transient error — keeping session; next API 401 will retry", authErrFields(err));
        }
    }
}

/**
 * Schedules logout at JWT expiry. Before logging out, tries refresh — otherwise idle tabs
 * lose the session even when the refresh token is still valid (HTTP-only refresh never ran).
 */
export function scheduleAutoLogout(token: string) {
    try {
        const { expiresInMs } = getTokenExpiration(token);

        if (logoutTimer) {
            clearTimeout(logoutTimer);
            logoutTimer = null;
        }

        authLog("scheduleAutoLogout", { expiresInMs });

        if (expiresInMs <= 0) {
            void refreshOrLogout();
            return;
        }

        logoutTimer = window.setTimeout(() => {
            logoutTimer = null;
            void refreshOrLogout();
        }, expiresInMs);
    } catch (err) {
        authLog("scheduleAutoLogout: JWT decode failed, attempting refresh", authErrFields(err));
        void refreshOrLogout();
    }
}
