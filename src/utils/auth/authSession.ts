import { logout } from "../../api/apirequest";
import { getTokenExpiration } from "./jwt";

let logoutTimer: number | null = null;

export function scheduleAutoLogout(token: string) {
    try {
        const { expiresInMs } = getTokenExpiration(token);

        if (expiresInMs <= 0) {
            logout();
            return;
        }

        if (logoutTimer) {
            clearTimeout(logoutTimer);
        }

        logoutTimer = window.setTimeout(() => {
            logout();
        }, expiresInMs);
    } catch {
        logout();
    }
}
