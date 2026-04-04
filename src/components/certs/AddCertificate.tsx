// src/components/AddCertificate.tsx
import React, { useState } from "react";
import "../../css/Certificates.css";
import { FaPlus } from "react-icons/fa";

// orval
import { postApiOpenVpnCertsBuild } from "../../api/orval/open-vpn-server-certs/open-vpn-server-certs.ts";
import type { BuildCertificateRequest } from "../../api/orval/model";
import axios from "axios";
import { axiosResponseDataMessage, axiosResponseDetail, errorMessage } from "../../utils/errorMessage";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddCertificate: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCertCommonName, setNewCertCommonName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAddCertificate = async () => {
    const cn = newCertCommonName.trim();
    if (!cn) {
      setMessage({ type: "error", text: "Please enter a Common Name." });
      return;
    }
    if (!vpnServerId) return;

    setLoading(true);
    setMessage(null);

    try {
      // Direct call expects BuildCertificateRequest (NOT { data: ... })
      const req: BuildCertificateRequest = {
        vpnServerId: Number(vpnServerId),
        commonName: cn,
      };
      await postApiOpenVpnCertsBuild(req);

      setNewCertCommonName("");
      setMessage({ type: "success", text: "Certificate added successfully!" });
      onSuccess();
    } catch (error: unknown) {
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      const msg =
        axiosResponseDataMessage(data) ??
        (axios.isAxiosError(error) ? error.message : undefined) ??
        errorMessage(error) ??
        "Failed to add certificate.";
      const detail = axiosResponseDetail(data) ?? "";
      setMessage({ type: "error", text: `${msg}${detail ? ` ${detail}` : ""}` });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!newCertCommonName.trim() && !loading;

  return (
    <div className="add-certificate">
      <input
        type="text"
        placeholder="Enter Common Name"
        value={newCertCommonName}
        onChange={(e) => {
          setNewCertCommonName(e.target.value);
          setMessage(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) handleAddCertificate();
        }}
        className="input"
      />

      <button className="btn primary" onClick={handleAddCertificate} disabled={!canSubmit}>
        <span className="icon"><FaPlus className="icon" /></span>
        {loading ? "Adding..." : "Add Certificate"}
      </button>

      {message && (
        <p className={message.type === "success" ? "message-success" : "message-error"}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default AddCertificate;