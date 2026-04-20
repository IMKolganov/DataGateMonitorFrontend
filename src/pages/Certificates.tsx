// src/pages/Certificates.tsx
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FaKey } from "react-icons/fa";
import CertificatesData from "../components/certs/CertificatesData.tsx";
import "../css/Certificates.css";
import "../css/Settings.css";

// Import generated model type
import type { VpnServerResponse } from "../api/orval/model";

// Import generated hook
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";

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

  return (
    <div className="certificates-page">
      <h2 className="certificates-page__title settings-page__h2-with-icon">
        <FaKey className="icon" aria-hidden />
        <span>
          VPN Certificates &amp; OVPN Files for Server{" "}
          {serverQuery.isLoading ? "…" : serverName || vpnServerId}
        </span>
      </h2>

      <CertificatesData vpnServerId={vpnServerId || ""} />
    </div>
  );
};

export default Certificates;
