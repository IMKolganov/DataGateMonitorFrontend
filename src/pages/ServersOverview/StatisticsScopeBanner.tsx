import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

const bannerStyle: CSSProperties = {
  marginBottom: 16,
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  backgroundColor: "var(--bg-card)",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--text-secondary)",
};

function userLabel(name: string | undefined, fallback: string): string {
  const t = name?.trim();
  return t || fallback;
}

type Props = {
  externalId?: string;
  vpnServerId?: number;
  /** Resolved dashboard / OpenVPN display name (not external ID). */
  userDisplayName?: string;
  /** Resolved `serverName` from API for the current VPN server id. */
  vpnServerDisplayName?: string;
};

export function StatisticsScopeBanner({
  externalId,
  vpnServerId,
  userDisplayName,
  vpnServerDisplayName,
}: Props) {
  if (!externalId && vpnServerId == null) {
    return (
      <div style={bannerStyle} role="status">
        The charts and tables below include traffic for{" "}
        <strong style={{ color: "var(--text-primary)" }}>all VPN servers</strong> and{" "}
        <strong style={{ color: "var(--text-primary)" }}>all OpenVPN users</strong> in the
        selected period.
      </div>
    );
  }

  if (externalId && vpnServerId != null) {
    const who = userLabel(userDisplayName, "User");
    const serverTitle =
      vpnServerDisplayName?.trim() || `VPN server #${vpnServerId}`;
    return (
      <div style={bannerStyle} role="status">
        <p style={{ margin: "0 0 12px 0" }}>
          Statistics are limited to{" "}
          <strong style={{ color: "var(--text-primary)" }}>{who}</strong> on{" "}
          <strong style={{ color: "var(--text-primary)" }}>{serverTitle}</strong> only.
        </p>
        <Link
          className="btn primary"
          to={`/servers/statistics/${encodeURIComponent(externalId)}`}
          style={{ display: "inline-block", textDecoration: "none" }}
        >
          View statistics for all VPN servers
        </Link>
      </div>
    );
  }

  if (externalId && vpnServerId == null) {
    const who = userLabel(userDisplayName, "User");
    return (
      <div style={bannerStyle} role="status">
        <p style={{ margin: "0 0 8px 0" }}>
          Statistics are for{" "}
          <strong style={{ color: "var(--text-primary)" }}>{who}</strong> aggregated across{" "}
          <strong style={{ color: "var(--text-primary)" }}>all VPN servers</strong>.
        </p>
        <p style={{ margin: 0 }}>
          Open a server from the{" "}
          <Link to="/servers">servers list</Link> to view this user on one server only.
        </p>
      </div>
    );
  }

  const serverTitle =
    vpnServerId != null && vpnServerDisplayName?.trim()
      ? vpnServerDisplayName.trim()
      : vpnServerId != null
        ? `VPN server #${vpnServerId}`
        : "";

  return (
    <div style={bannerStyle} role="status">
      Statistics below are for{" "}
      <strong style={{ color: "var(--text-primary)" }}>{serverTitle}</strong> (all users on this
      server).
    </div>
  );
}
