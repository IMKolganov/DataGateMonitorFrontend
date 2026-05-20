import type { ReactNode } from "react";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { ServerAccessDenied } from "./ServerAccessDenied";

type Props = {
  featureLabel: string;
  children: ReactNode;
};

/** Blocks non-admin users on server admin subpages (certificates, console, ovpn config). */
export function AdminServerPageGate({ featureLabel, children }: Props) {
  if (!isAdmin(getCurrentUser())) {
    return (
      <ServerAccessDenied
        title="Access restricted"
        message={`${featureLabel} is available to administrators only.`}
      />
    );
  }

  return <>{children}</>;
}
