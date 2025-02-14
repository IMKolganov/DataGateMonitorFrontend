import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import CertificatesTable from "../components/CertificatesTable";
import Loading from "../components/Loading";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import { Config, Certificate, CertificateStatus } from "../utils/types";
import "../css/Certificates.css";

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId: string }>();
  const [config, setConfig] = useState<Config | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [newCommonName, setNewCommonName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config && vpnServerId) {
      fetchCertificates();
    }
  }, [config, selectedStatus, vpnServerId]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
      setError({ message: "Failed to load configuration." });
    }
  };

  const fetchCertificates = useCallback(async () => {
    if (!config || !vpnServerId) return;
    setLoading(true);
    setError(null);

    try {
      const url = selectedStatus !== null
        ? `${config.apiBaseUrl}/OpenVpnServerCerts/GetAllVpnServerCertificatesByStatus/${vpnServerId}?certificateStatus=${selectedStatus}`
        : `${config.apiBaseUrl}/OpenVpnServerCerts/GetAllVpnServerCertificates/${vpnServerId}`;

      const response = await axios.get<Certificate[]>(url);
      setCertificates(response.data);
    } catch (error: any) {
      console.error("Error fetching certificates", error);
      setError({
        message: error.response?.data?.Message || "Failed to load certificates",
        detail: error.response?.data?.Detail,
      });
    } finally {
      setLoading(false);
    }
  }, [config, selectedStatus, vpnServerId]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value ? Number(event.target.value) as CertificateStatus : null);
  };

  const handleAddCertificate = async () => {
    if (!newCommonName.trim()) return alert("Please enter a common name.");
    if (!config || !vpnServerId) return;

    try {
      await axios.get(`${config.apiBaseUrl}/OpenVpnServerCerts/AddServerCertificate/${vpnServerId}?cnName=${newCommonName}`);
      setNewCommonName("");
      fetchCertificates();
    } catch (error: any) {
      console.error("Failed to add certificate", error);
      setError({
        message: error.response?.data?.Message || "Error adding certificate.",
        detail: error.response?.data?.Detail,
      });
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Certificates for Server {vpnServerId}</h2>
      <div className="action-buttons">
        <button className="btn secondary" onClick={() => navigate("/")}> 
          <FaArrowLeft className="icon" /> Back 
        </button>
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

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="error-message">
          <p><strong>Error:</strong> {error.message}</p>
          {error.detail && <p><strong>Details:</strong> {error.detail}</p>}
        </div>
      ) : (
        certificates.length > 0 && (
          <CertificatesTable certificates={certificates} vpnServerId={vpnServerId || ""} onRevoke={fetchCertificates} />
        )
      )}

      <h3>Add New Certificate</h3>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> for the new certificate and click "Add Certificate".
      </p>
      
      <div className="add-certificate">
        <input 
          type="text" 
          placeholder="Enter Common Name" 
          value={newCommonName} 
          onChange={(e) => setNewCommonName(e.target.value)} 
          className="input" 
        />
        <button className="btn primary" onClick={handleAddCertificate}> 
          Add Certificate 
        </button>
      </div>
    </div>
  );
};

export default Certificates;
