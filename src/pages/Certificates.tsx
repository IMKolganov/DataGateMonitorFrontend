import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import CertificatesTable from "../components/CertificatesTable";
import { FaSync } from "react-icons/fa";

interface Config {
  apiBaseUrl: string;
}

interface Certificate {
  commonName: string;
  status: "Active" | "Revoked";
  expiryDate: string;
  serialNumber: string;
}

const Certificates: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
const fetchCertificates = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Certificate[]>(`${config.apiBaseUrl}/OpenVpnCerts/GetAllVpnCertificates`);
      setCertificates(response.data);
    } catch (error) {
      console.error("Error fetching certificates", error);
      setError("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [config]);


  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchCertificates();
    }
  }, [config, fetchCertificates]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };



  return (
    <div style={{ padding: "20px" }}>
      <h2>VPN Certificates</h2>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <button
          className="btn secondary"
          onClick={fetchCertificates}
          disabled={loading}
        >
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
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
