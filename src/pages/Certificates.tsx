// src/pages/Certificates.tsx
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import CertificatesData from "../components/certs/CertificatesData.tsx";
import "../css/Certificates.css";

// Import generated model type
import type { OpenVpnServerResponse } from "../api/orval/model";

// Import generated hook
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/open-vpn-servers/open-vpn-servers";

// Helper to unwrap ApiResponse<T>
function unwrap<T>(resp: any): T | undefined {
  if (!resp) return undefined;
  if (typeof resp === "object" && "data" in resp) return resp.data as T;
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

  const apiPayload = unwrap<OpenVpnServerResponse>(serverQuery.data);
  const serverName = apiPayload?.openVpnServer?.serverName ?? "(unknown)";

  return (
    <div>
      <h2>
        VPN Certificates &amp; OVPN Files for Server{" "}
        {serverQuery.isLoading ? "…" : serverName || vpnServerId}
      </h2>

      <div className="header-container" />
      <CertificatesData vpnServerId={vpnServerId || ""} />
    </div>
  );
};

export default Certificates;
