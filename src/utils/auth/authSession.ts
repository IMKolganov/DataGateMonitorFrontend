import { logout, refreshSessionTokens } from "../../api/apirequest";
import { getTokenExpiration } from "./jwt";

let logoutTimer: number | null = null;

async function refreshOrLogout(): Promise<void> {
    try {
        const newToken = await refreshSessionTokens();
        const { expiresInMs } = getTokenExpiration(newToken);
        if (expiresInMs <= 0) {
            logout();
            return;
        }
        scheduleAutoLogout(newToken);
    } catch {
        logout();
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

        if (expiresInMs <= 0) {
            void refreshOrLogout();
            return;
        }

        logoutTimer = window.setTimeout(() => {
            logoutTimer = null;
            void refreshOrLogout();
        }, expiresInMs);
    } catch {
        void refreshOrLogout();
    }
}
