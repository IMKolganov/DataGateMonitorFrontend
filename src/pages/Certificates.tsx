// src/pages/Certificates.tsx
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FaKey } from "react-icons/fa";
import CertificatesData from "../components/certs/CertificatesData.tsx";
import "../css/Certificates.css";
import "../css/Settings.css";

// Import generated model type
import type { VpnServerResponse } from "../api/orvalModelShim";

// Import generated hook
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import { isOpenVpnStack, VpnServerType } from "../constants/vpnServerType";
import { AdminServerPageGate } from "../components/AdminServerPageGate";

// Helper to unwrap ApiResponse<T>
function unwrap<T>(resp: unknown): T | undefined {
  if (resp == null) return undefined;
  if (typeof resp === "object" && resp !== null && "data" in resp) {
    return (resp as { data: T }).data;
  }
  return resp as T;
}

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  const numericId = useMemo(
    () => (vpnServerId ? Number(vpnServerId) : undefined),
    [vpnServerId]
  );

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(numericId ?? 0, {
    query: {
      enabled: Number.isFinite(numericId),
      staleTime: 10_000,
      retry: 1,
    },
  });

  const apiPayload = unwrap<VpnServerResponse>(serverQuery.data);
  const serverName = apiPayload?.vpnServer?.serverName ?? "(unknown)";
  /** Match server type from payload (incl. cache) so the title does not flash OpenVPN copy for Xray. */
  const isXray = Boolean(
    numericId && apiPayload?.vpnServer?.serverType === VpnServerType.Xray,
  );

  return (
    <AdminServerPageGate featureLabel="Certificate management">
      {numericId && serverQuery.isSuccess && !isOpenVpnStack(apiPayload?.vpnServer?.serverType) && !isXray ? (
        <div className="certificates-page">
          <p>This server type does not support issued client files from the dashboard.</p>
        </div>
      ) : numericId && serverQuery.isPending ? (
        <div className="certificates-page">
          <p>Loading server…</p>
        </div>
      ) : (
        <div className="certificates-page">
          <h2 className="certificates-page__title settings-page__h2-with-icon">
            <FaKey className="icon" aria-hidden />
            <span>
              {isXray ? "VLESS client links" : "VPN Certificates & OVPN Files"} for Server{" "}
              {serverQuery.isLoading ? "…" : serverName || vpnServerId}
            </span>
          </h2>

          <CertificatesData vpnServerId={vpnServerId || ""} stack={isXray ? "xray" : "openvpn"} />
        </div>
      )}
    </AdminServerPageGate>
  );
};

export default Certificates;
