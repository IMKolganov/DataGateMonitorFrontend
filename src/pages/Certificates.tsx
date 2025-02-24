import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import { addOvpnFile, addCertificate } from "../utils/api";
import CertificatesData from "../components/CertificatesData";
import { CertificateStatus } from "../utils/types";
import "../css/Certificates.css";

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId: string }>();
  const [newCommonName, setNewCommonName] = useState<string>("");
  const [newExternalId, setNewExternalId] = useState<string>("");
  const [newCertCommonName, setNewCertCommonName] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleAddOvpnFile = async () => {
    if (!newCommonName.trim()) return alert("Please enter a Common Name.");
    if (!newExternalId.trim()) return alert("Please enter an External ID.");
    if (!vpnServerId) return;

    setLoadingAction(true);
    try {
      await addOvpnFile(vpnServerId, newExternalId, newCommonName, "openVpnClient");
      setNewCommonName("");
      setNewExternalId("");
    } catch (error: any) {
      console.error("Failed to add OVPN file", error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddCertificate = async () => {
    if (!newCertCommonName.trim()) return alert("Please enter a Common Name.");
    if (!vpnServerId) return;

    setLoadingAction(true);
    try {
      await addCertificate(vpnServerId, newCertCommonName);
      setNewCertCommonName("");
    } catch (error: any) {
      console.error("Failed to add certificate", error);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Certificates & OVPN Files for Server {vpnServerId}</h2>
      <div className="header-containe">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              <FaArrowLeft className="icon" /> Back
            </button>
            <button className="btn secondary" onClick={() => window.location.reload()} disabled={loadingAction}>
              <FaSync className={`icon ${loadingAction ? "icon-spin" : ""}`} /> Refresh
            </button>
            <select value={selectedStatus ?? ""} onChange={(e) => setSelectedStatus(Number(e.target.value) || null)} className="btn secondary">
              <option value="">All</option>
              <option value={CertificateStatus.Active}>Active</option>
              <option value={CertificateStatus.Revoked}>Revoked</option>
              <option value={CertificateStatus.Expired}>Expired</option>
              <option value={CertificateStatus.Unknown}>Unknown</option>
            </select>
          </div>
        </div>
      </div>
      <CertificatesData vpnServerId={vpnServerId || ""} />

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
        <button className="btn primary" onClick={handleAddOvpnFile} disabled={loadingAction}>
          Make new OVPN file
        </button>
      </div>

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
        <button className="btn primary" onClick={handleAddCertificate} disabled={loadingAction}>
          Add Certificate
        </button>
      </div>
    </div>
  );
};

export default Certificates;
