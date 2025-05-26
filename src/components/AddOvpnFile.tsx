import React, { useState } from "react";
import { addOvpnFile } from "../utils/api";
import "../css/Certificates.css";
import { FaPlus, FaCog } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddOvpnFile: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCommonName, setNewCommonName] = useState<string>("");
  const [newExternalId, setNewExternalId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const navigate = useNavigate();
  

  const handleAddOvpnFile = async () => {
    if (!newCommonName.trim()) {
      setMessage({ type: "error", text: "Please enter a Common Name." });
      return;
    }
    if (!newExternalId.trim()) {
      setMessage({ type: "error", text: "Please enter an External ID." });
      return;
    }
    if (!vpnServerId) {
      setMessage({ type: "error", text: "VPN Server ID is missing." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await addOvpnFile(Number(vpnServerId), newExternalId, newCommonName, "openVpnClient");
      setNewCommonName("");
      setNewExternalId("");
      setMessage({ type: "success", text: "OVPN file added successfully!" });
      onSuccess();
    } catch (error: any) {
      console.error("Failed to add OVPN file", error);
      
      let errorMessage = "Failed to add OVPN file.";
      if (error.response?.data) {
        const data = error.response.data;
        errorMessage = data.Message || errorMessage;
        if (data.Detail) errorMessage += ` Details: ${data.Detail}`;
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-certificate">
      <input
        type="text"
        placeholder="Enter Common Name"
        value={newCommonName}
        onChange={(e) => {
          setNewCommonName(e.target.value);
          setMessage(null);
        }}
        className="input"
      />
      <input
        type="text"
        placeholder="Enter External ID"
        value={newExternalId}
        onChange={(e) => {
          setNewExternalId(e.target.value);
          setMessage(null);
        }}
        className="input"
      />
      <button className="btn primary" onClick={handleAddOvpnFile} disabled={loading}>
        {FaPlus({ className: "icon" })}{loading ? "Adding..." : "Make new OVPN file"}
      </button>
      <button className="btn secondary" onClick={() => navigate(`/servers/${vpnServerId}/ovpn-file-config/`)}>
        {FaCog({ className: "icon" })}
        {loading ? "Adding..." : "Change config OVPN file"}
      </button>
      {message && (
        <p className={message.type === "success" ? "message-success" : "message-error"}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default AddOvpnFile;
