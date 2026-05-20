import { authErrFields, authLog } from "./authLog";
import { getTokenExpiration } from "./jwt";

let logoutTimer: number | null = null;
let onTokenExpiring: (() => void | Promise<void>) | null = null;

export function registerTokenExpiryHandler(handler: () => void | Promise<void>): void {
    onTokenExpiring = handler;
}

/**
 * Schedules a callback at JWT expiry. Register {@link registerTokenExpiryHandler} once at startup
 * (see authSession.ts) before calling this.
 */
export function scheduleAutoLogout(token: string): void {
    try {
        const { expiresInMs } = getTokenExpiration(token);

        if (logoutTimer) {
            clearTimeout(logoutTimer);
            logoutTimer = null;
        }

        authLog("scheduleAutoLogout", { expiresInMs });

        if (expiresInMs <= 0) {
            void onTokenExpiring?.();
            return;
        }

        logoutTimer = window.setTimeout(() => {
            logoutTimer = null;
            void onTokenExpiring?.();
        }, expiresInMs);
    } catch (err) {
        authLog("scheduleAutoLogout: JWT decode failed, attempting refresh", authErrFields(err));
        void onTokenExpiring?.();
    }
}
