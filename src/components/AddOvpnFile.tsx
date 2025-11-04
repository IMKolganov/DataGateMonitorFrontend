import React, { useState, useCallback } from "react";
import "../css/Certificates.css";
import { FaPlus, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// orval
import { usePostApiOpenVpnFilesAdd } from "../api/orval/open-vpn-files/open-vpn-files";
import type { AddFileRequest } from "../api/orval/model";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddOvpnFile: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCommonName, setNewCommonName] = useState<string>("");
  const [newExternalId, setNewExternalId] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // orval mutation (ogmMutator returns unwrapped data in this project)
  const { mutateAsync: addMutate, isPending } = usePostApiOpenVpnFilesAdd();

  const navigate = useNavigate();

  const validate = useCallback((): string | null => {
    if (!vpnServerId) return "VPN Server ID is missing.";
    if (!newCommonName.trim()) return "Please enter a Common Name.";
    if (!newExternalId.trim()) return "Please enter an External ID.";
    return null;
  }, [vpnServerId, newCommonName, newExternalId]);

  const handleAddOvpnFile = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setMessage(null);

    try {
      // Minimal request body. If your AddFileRequest has more fields (e.g. profile type),
      // extend the object below accordingly.
      const data = {
        vpnServerId: Number(vpnServerId),
        externalId: newExternalId.trim(),
        commonName: newCommonName.trim(),
      } as unknown as AddFileRequest;

      await addMutate({ data });

      setNewCommonName("");
      setNewExternalId("");
      setMessage({ type: "success", text: "OVPN file added successfully!" });
      toast.success("OVPN file created");
      onSuccess();
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.Message ||
        error?.message ||
        "Failed to add OVPN file.";
      const detail = error?.response?.data?.Detail;
      const text = detail ? `${errMsg} Details: ${detail}` : errMsg;

      setMessage({ type: "error", text });
      toast.error(errMsg);
      console.error("Failed to add OVPN file", error);
    }
  }, [addMutate, vpnServerId, newExternalId, newCommonName, onSuccess, validate]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isPending) {
        void handleAddOvpnFile();
      }
    },
    [handleAddOvpnFile, isPending]
  );

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
        onKeyDown={onKeyDown}
        className="input"
        aria-label="Common Name"
        disabled={isPending}
      />
      <input
        type="text"
        placeholder="Enter External ID"
        value={newExternalId}
        onChange={(e) => {
          setNewExternalId(e.target.value);
          setMessage(null);
        }}
        onKeyDown={onKeyDown}
        className="input"
        aria-label="External ID"
        disabled={isPending}
      />

      <button className="btn primary" onClick={handleAddOvpnFile} disabled={isPending}>
        <FaPlus className="icon" />
        {isPending ? "Adding..." : "Make new OVPN file"}
      </button>

      <button
        className="btn secondary"
        onClick={() => navigate(`/servers/${vpnServerId}/ovpn-file-config/`)}
        disabled={isPending}
      >
        <FaCog className="icon" />
        Change config OVPN file
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
