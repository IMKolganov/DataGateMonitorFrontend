import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  addOvpnFile,
  revokeOvpnFile,
  addCertificate,
  fetchCertificates,
  fetchOvpnFiles,
} from "../utils/api";
import CertificatesTable from "../components/CertificatesTable";
import OvpnFilesTable from "../components/OvpnFilesTable";
import Loading from "../components/Loading";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import { Certificate, CertificateStatus } from "../utils/types";
import "../css/Certificates.css";

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId: string }>();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [ovpnFiles, setOvpnFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [newCommonName, setNewCommonName] = useState<string>("");
  const [newExternalId, setNewExternalId] = useState<string>("");
  const [newCertCommonName, setNewCertCommonName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    if (vpnServerId) {
      fetchData();
    }
  }, [vpnServerId, selectedStatus]);

  const fetchData = useCallback(async () => {
    if (!vpnServerId) return;
    setLoading(true);
    setError(null);

    try {
      const certs = await fetchCertificates(vpnServerId, selectedStatus !== null ? String(selectedStatus) : undefined);
      const ovpnFilesList = await fetchOvpnFiles(vpnServerId);
      setCertificates(certs);
      setOvpnFiles(ovpnFilesList);
    } catch (error: any) {
      console.error("Error fetching certificates or OVPN files", error);
      setError({
        message: error.response?.data?.Message || "Failed to load data",
        detail: error.response?.data?.Detail,
      });
    } finally {
      setLoading(false);
    }
  }, [vpnServerId, selectedStatus]);

  const handleAddOvpnFile = async () => {
    if (!newCommonName.trim()) return alert("Please enter a Common Name.");
    if (!newExternalId.trim()) return alert("Please enter an External ID.");
    if (!vpnServerId) return;

    try {
      await addOvpnFile(vpnServerId, newExternalId, newCommonName, "openVpnClient");
      setNewCommonName("");
      setNewExternalId("");
      fetchData();
    } catch (error: any) {
      console.error("Failed to add OVPN file", error);
      setError({
        message: error.response?.data?.Message || "Error adding OVPN file.",
        detail: error.response?.data?.Detail,
      });
    }
  };

  const handleAddCertificate = async () => {
    if (!newCertCommonName.trim()) return alert("Please enter a Common Name.");
    if (!vpnServerId) return;

    try {
      await addCertificate(vpnServerId, newCertCommonName);
      setNewCertCommonName("");
      fetchData();
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
      <h2>VPN Certificates & OVPN Files for Server {vpnServerId}</h2>
      <div className="action-buttons">
        <button className="btn secondary" onClick={() => navigate("/")}> 
          <FaArrowLeft className="icon" /> Back 
        </button>
        <button className="btn secondary" onClick={fetchData} disabled={loading}> 
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh 
        </button>
        <select value={selectedStatus ?? ""} onChange={(e) => setSelectedStatus(Number(e.target.value) || null)} className="btn secondary"> 
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
        <>
          <h3>Issued OVPN Files</h3>
          <OvpnFilesTable ovpnFiles={ovpnFiles} vpnServerId={vpnServerId || ""} onRevoke={fetchData} />

          <h3>Make New OVPN File for Client</h3>
          <p className="certificate-description">
            Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
          </p>

          <div className="add-certificate">
            <input 
              type="text" 
              placeholder="Enter Common Name" 
              value={newCommonName} 
              onChange={(e) => setNewCommonName(e.target.value)} 
              className="input" 
            />
            <input 
              type="text" 
              placeholder="Enter External ID" 
              value={newExternalId} 
              onChange={(e) => setNewExternalId(e.target.value)}
              className="input" 
            />
            <button className="btn primary" onClick={handleAddOvpnFile}> 
              Make new OVPN file 
            </button>
          </div>

          <h3>Certificates</h3>
          <CertificatesTable certificates={certificates} vpnServerId={vpnServerId || ""} onRevoke={fetchData} />

          <h3>Add New Certificate</h3>
          <p className="certificate-description">
            Enter the <strong>Common Name (CN)</strong> for the new certificate and click "Add Certificate".
          </p>

          <div className="add-certificate">
            <input 
              type="text" 
              placeholder="Enter Common Name" 
              value={newCertCommonName} 
              onChange={(e) => setNewCertCommonName(e.target.value)} 
              className="input" 
            />
            <button className="btn primary" onClick={handleAddCertificate}> 
              Add Certificate 
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Certificates;
