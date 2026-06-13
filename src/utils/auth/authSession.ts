import { logout, refreshSessionTokens, shouldLogoutOnRefreshError } from "../../api/apirequest";
import { authErrFields, authLog } from "./authLog";
import { getTokenExpiration } from "./jwt";
import { registerTokenExpiryHandler, scheduleAutoLogout } from "./tokenExpiryScheduler";

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

registerTokenExpiryHandler(refreshOrLogout);

export { scheduleAutoLogout };
