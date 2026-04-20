import React from "react";
import { Link } from "react-router-dom";
import { FaInfoCircle } from "react-icons/fa";
import "../../css/Settings.css";

type Props = {
  vpnServerId: string;
  /** Short title, e.g. "Web console" */
  featureLabel: string;
  /** Optional extra line */
  children?: React.ReactNode;
};

/**
 * Shown for Xray (VLESS) servers where a screen only applies to OpenVPN (management, OVPN, EasyRSA, etc.).
 */
export function OpenVpnServerFeaturePlaceholder({ vpnServerId, featureLabel, children }: Props) {
  return (
    <div className="settings-card" style={{ maxWidth: 720, margin: "16px auto" }}>
      <h2 className="settings-page__h2-with-icon" style={{ marginTop: 0 }}>
        <FaInfoCircle className="icon" aria-hidden />
        <span>
          {featureLabel} — only for OpenVPN
        </span>
      </h2>
      <p style={{ lineHeight: 1.5 }}>
        This server is an <strong>Xray (VLESS)</strong> node. The <strong>{featureLabel}</strong> page is for OpenVPN
        servers (management API, .ovpn templates, certificates, or OpenVPN event logs).
      </p>
      {children}
      <p style={{ marginTop: 16 }}>
        <Link className="btn secondary" to={`/servers/${vpnServerId}`}>
          ← Back to server overview
        </Link>
      </p>
    </div>
  );
}
