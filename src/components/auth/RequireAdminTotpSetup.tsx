import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { ADMIN_TOTP_SETUP_PATH } from "../../utils/auth/handleLoginResponse";
import { getTotpStatus } from "../../utils/auth/totpApi";

type Props = {
  children: ReactNode;
};

/** Redirects admins without TOTP to the security settings page until enrollment completes. */
export function RequireAdminTotpSetup({ children }: Props) {
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const user = getCurrentUser();
      if (!isAdmin(user)) {
        if (!cancelled) setAllowed(true);
        return;
      }

      if (
        location.pathname === ADMIN_TOTP_SETUP_PATH ||
        location.pathname.startsWith(`${ADMIN_TOTP_SETUP_PATH}/`)
      ) {
        if (!cancelled) setAllowed(true);
        return;
      }

      try {
        const status = await getTotpStatus();
        if (cancelled) return;
        setAllowed(!(status.isAdmin && status.requiresTotpSetup));
      } catch {
        if (!cancelled) setAllowed(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (allowed === null) {
    return null;
  }

  if (!allowed) {
    return <Navigate to={ADMIN_TOTP_SETUP_PATH} replace />;
  }

  return <>{children}</>;
}
