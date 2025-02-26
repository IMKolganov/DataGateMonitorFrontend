import React, { useState } from "react";
import { addCertificate } from "../utils/api";
import "../css/Certificates.css";
import { FaPlus } from "react-icons/fa";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddCertificate: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCertCommonName, setNewCertCommonName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAddCertificate = async () => {
    if (!newCertCommonName.trim()) {
      setMessage({ type: "error", text: "Please enter a Common Name." });
      return;
    }
    if (!vpnServerId) return;

    setLoading(true);
    setMessage(null);

    try {
      await addCertificate(vpnServerId, newCertCommonName);
      setNewCertCommonName("");
      setMessage({ type: "success", text: "Certificate added successfully!" });
      onSuccess();
    } catch (error: any) {
      console.error("Failed to add certificate", error);
      const errorMessage = error.response?.data?.Message || "Failed to add certificate.";
      const errorDetail = error.response?.data?.Detail || "";
      setMessage({ type: "error", text: `${errorMessage} ${errorDetail}` });
    } finally {
      setLoading(false);
    }
  };

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
        className="input"
      />
      <button className="btn primary" onClick={handleAddCertificate} disabled={loading}>
        <FaPlus className="icon" />{loading ? "Adding..." : "Add Certificate"}
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
