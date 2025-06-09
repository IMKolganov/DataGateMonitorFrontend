import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import CertificatesData from "../components/CertificatesData";
import { getServer } from "../utils/api";
import "../css/Certificates.css";

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [vpnServerName, setVpnServerName] = useState<string>("");

  useEffect(() => {
    const fetchServer = async () => {
      if (!vpnServerId) return;
      try {
        const server = await getServer(vpnServerId);
        setVpnServerName(server.serverName || "(unknown)");
      } catch (error) {
        console.error("Failed to load VPN server:", error);
        setVpnServerName("(unknown)");
      }
    };

    fetchServer();
  }, [vpnServerId]);

  return (
    <div>
      <h2>VPN Certificates & OVPN Files for Server {vpnServerName || vpnServerId}</h2>
      <div className="header-containe">
      </div>
      <CertificatesData vpnServerId={vpnServerId || ""} />
    </div>
  );
};

export default Certificates;
