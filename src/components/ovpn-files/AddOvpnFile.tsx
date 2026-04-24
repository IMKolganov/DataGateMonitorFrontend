import React, { useState, useCallback } from "react";
import "../../css/Certificates.css";
import { FaPlus, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { usePostApiOpenVpnFilesAdd } from "../../api/orval/open-vpn-files/open-vpn-files.ts";
import type { AddFileRequest } from "../../api/orvalModelShim";
import axios from "axios";
import { axiosResponseDataMessage, axiosResponseDetail, errorMessage } from "../../utils/errorMessage";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddOvpnFile: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCommonName, setNewCommonName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    } catch (error: unknown) {
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errMsg =
        axiosResponseDataMessage(data) ??
        (axios.isAxiosError(error) ? error.message : undefined) ??
        errorMessage(error) ??
        "Failed to add OVPN file.";
      const detail = axiosResponseDetail(data);
      const text = detail ? `${errMsg} Details: ${detail}` : errMsg;

      setMessage({ type: "error", text });
      toast.error(errMsg);
    }
  }, [addMutate, vpnServerId, newExternalId, newCommonName, onSuccess, validate]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isPending) {
        void handleAddOvpnFile();
      }
    },
    [handleAddOvpnFile, isPending],
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

      <button className="btn primary" onClick={() => void handleAddOvpnFile()} disabled={isPending}>
        <FaPlus className="icon" />
        {isPending ? "Adding..." : "Make new OVPN file"}
      </button>

      <button
        className="btn secondary"
        type="button"
        onClick={() => navigate(`/servers/${vpnServerId}/ovpn-file-config/`)}
        disabled={isPending}
        title="Open OpenVPN .ovpn generation template settings"
      >
        <FaCog className="icon" />
        Change config OVPN file
      </button>

      <p className="certificate-description" style={{ marginTop: 10, maxWidth: 720, lineHeight: 1.45 }}>
        Creates a new <code>.ovpn</code> for a client. Secondary opens <strong>Configurations</strong> to edit the
        OpenVPN file template.
      </p>

      {message && (
        <p className={message.type === "success" ? "message-success" : "message-error"}>{message.text}</p>
      )}
    </div>
  );
};

export default AddOvpnFile;
