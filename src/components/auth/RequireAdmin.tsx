import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";

type Props = {
  children: ReactNode;
  redirectTo?: string;
};

/** Redirects non-admin users away from admin-only routes. */
export function RequireAdmin({ children, redirectTo = "/servers" }: Props) {
  if (!isAdmin(getCurrentUser())) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
