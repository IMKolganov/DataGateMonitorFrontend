import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  isLoginRedirectInProgress,
  logout,
} from "../../api/apirequest";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../../utils/auth/accessTokenEvents";
import {
  isAuthBootstrapPending,
  whenAuthBootstrapSettled,
} from "../../utils/auth/authBootstrap";
import { isAuthenticated } from "../../utils/auth/authSelectors";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../../utils/const";

/**
 * Must not SPA-Navigate to `?reason=missingToken` after logout() cleared tokens —
 * that race overwrote idleTimeout / refreshRejected and looked like a silent kick.
 *
 * Also waits for startup silent refresh (refresh-only storage) before treating missing
 * access as logout — otherwise F5 races PrivateRoute against restoreAuthSessionOnStartup.
 */
export function PrivateRoute({ children }: { children: ReactNode }): React.ReactElement {
  const [ok, setOk] = useState(() => isAuthenticated());
  const [bootstrapping, setBootstrapping] = useState(() => {
    if (isAuthenticated()) return false;
    if (isAuthBootstrapPending()) return true;
    return (
      !localStorage.getItem(ACCESS_TOKEN_KEY) &&
      !!localStorage.getItem(REFRESH_TOKEN_KEY)
    );
  });

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      setOk(isAuthenticated());
    };

    void whenAuthBootstrapSettled().then(() => {
      if (cancelled) return;
      setBootstrapping(false);
      sync();
    });

    window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (ok || bootstrapping || isLoginRedirectInProgress()) return;
    logout("missingToken");
  }, [ok, bootstrapping]);

  if (bootstrapping || !ok) return <></>;
  return <>{children}</>;
}
