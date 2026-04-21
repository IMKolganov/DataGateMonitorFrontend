import React, { useState, useCallback } from "react";
import "../../css/Certificates.css";
import { FaPlus, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// orval
import { usePostApiOpenVpnFilesAdd } from "../../api/orval/open-vpn-files/open-vpn-files.ts";
import type { AddFileRequest } from "../../api/orval/model";
import axios from "axios";
import { axiosResponseDataMessage, axiosResponseDetail, errorMessage } from "../../utils/errorMessage";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
  /** Xray: same API issues VLESS links; labels point to export template, not OpenVPN .ovpn. */
  stack?: "openvpn" | "xray";
}

const AddOvpnFile: React.FC<Props> = ({ vpnServerId, onSuccess, stack = "openvpn" }) => {
  const isXray = stack === "xray";
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
      setMessage({
        type: "success",
        text: isXray ? "Client link created successfully." : "OVPN file added successfully!",
      });
      toast.success(isXray ? "Client link created" : "OVPN file created");
      onSuccess();
    } catch (error: unknown) {
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errMsg =
        axiosResponseDataMessage(data) ??
        (axios.isAxiosError(error) ? error.message : undefined) ??
        errorMessage(error) ??
        isXray ? "Failed to create client link." : "Failed to add OVPN file.";
      const detail = axiosResponseDetail(data);
      const text = detail ? `${errMsg} Details: ${detail}` : errMsg;

      setMessage({ type: "error", text });
      toast.error(errMsg);
    }
  }, [addMutate, vpnServerId, newExternalId, newCommonName, onSuccess, validate, isXray]);

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
        {isPending ? "Adding..." : isXray ? "Create client link" : "Make new OVPN file"}
      </button>

      <button
        className="btn secondary"
        type="button"
        onClick={() => navigate(`/servers/${vpnServerId}/ovpn-file-config/`)}
        disabled={isPending}
        title={
          isXray
            ? "Open the VLESS client export template (IP, port, placeholders such as {{vless_uri}})"
            : "Open OpenVPN .ovpn generation template settings"
        }
      >
        <FaCog className="icon" />
        {isXray ? "Edit export template" : "Change config OVPN file"}
      </button>

      <p className="certificate-description" style={{ marginTop: 10, maxWidth: 720, lineHeight: 1.45 }}>
        {isXray ? (
          <>
            Primary button calls the dashboard API to issue a <strong>VLESS client link</strong> (not an{" "}
            <code>.ovpn</code> file). Secondary opens <strong>Client export template</strong> — the same tab labeled{" "}
            <strong>Client export template</strong> in the server menu for Xray.
          </>
        ) : (
          <>
            Primary creates a new <code>.ovpn</code> for a client. Secondary opens <strong>Configurations</strong> to
            edit the OpenVPN file template.
          </>
        )}
      </p>

      {message && (
        <p className={message.type === "success" ? "message-success" : "message-error"}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default AddOvpnFile;
