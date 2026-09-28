import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  isLoginRedirectInProgress,
  logout,
} from "../../api/apirequest";
import { isAuthenticated } from "../../utils/auth/authSelectors";

/**
 * Must not SPA-Navigate to `?reason=missingToken` after logout() cleared tokens —
 * that race overwrote idleTimeout / refreshRejected and looked like a silent kick.
 */
export function PrivateRoute({ children }: { children: ReactNode }): React.ReactElement {
  const ok = isAuthenticated();

  useEffect(() => {
    if (ok || isLoginRedirectInProgress()) return;
    logout("missingToken");
  }, [ok]);

  if (!ok) return <></>;
  return <>{children}</>;
}
