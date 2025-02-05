import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import CertificatesTable from "../components/CertificatesTable";
import { FaSync } from "react-icons/fa";

interface Config {
  apiBaseUrl: string;
}

enum CertificateStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Unknown = 3,
}

interface Certificate {
  commonName: string;
  status: number;
  expiryDate: string;
  revokeDate?: string | null;
  serialNumber: string;
}

const Certificates: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchCertificates();
    }
  }, [config, selectedStatus]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const fetchCertificates = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);

    try {
      const url = selectedStatus !== null
        ? `${config.apiBaseUrl}/OpenVpnCerts/GetAllVpnCertificatesByStatus?certificateStatus=${selectedStatus}`
        : `${config.apiBaseUrl}/OpenVpnCerts/GetAllVpnCertificates`;

      const response = await axios.get<Certificate[]>(url);
      setCertificates(response.data);
    } catch (error) {
      console.error("Error fetching certificates", error);
      setError("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [config, selectedStatus]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value ? Number(event.target.value) as CertificateStatus : null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>VPN Certificates</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <button className="btn secondary" onClick={fetchCertificates} disabled={loading}>
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>

        <select value={selectedStatus ?? ""} onChange={handleStatusChange} className="btn secondary">
          <option value="">All</option>
          <option value={CertificateStatus.Active}>Active</option>
          <option value={CertificateStatus.Revoked}>Revoked</option>
          <option value={CertificateStatus.Expired}>Expired</option>
          <option value={CertificateStatus.Unknown}>Unknown</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {certificates.length > 0 ? (
        <CertificatesTable certificates={certificates} onRevoke={fetchCertificates} />
      ) : (
        <p>{loading ? "Loading..." : "No certificates found."}</p>
      )}
    </div>
  );
};

export default Certificates;
