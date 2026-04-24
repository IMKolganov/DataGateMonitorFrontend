import React, { useState, useCallback } from "react";
import "../../css/Certificates.css";
import { FaPlus, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { postApiXrayClientLinksAdd } from "../../api/xrayClientLinks.ts";
import type { AddFileRequest } from "../../api/orvalModelShim";
import axios from "axios";
import { axiosResponseDataMessage, axiosResponseDetail, errorMessage } from "../../utils/errorMessage";

interface Props {
  vpnServerId: string;
  onSuccess: () => void;
}

const AddXrayClientLink: React.FC<Props> = ({ vpnServerId, onSuccess }) => {
  const [newCommonName, setNewCommonName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { mutateAsync: addMutate, isPending } = useMutation({
    mutationFn: (vars: { data: AddFileRequest }) => postApiXrayClientLinksAdd(vars.data),
  });

  const navigate = useNavigate();

  const validate = useCallback((): string | null => {
    if (!vpnServerId) return "VPN Server ID is missing.";
    if (!newCommonName.trim()) return "Please enter a Common Name.";
    if (!newExternalId.trim()) return "Please enter an External ID.";
    return null;
  }, [vpnServerId, newCommonName, newExternalId]);

  const handleSubmit = useCallback(async () => {
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
      setMessage({ type: "success", text: "Client link created successfully." });
      toast.success("Client link created");
      onSuccess();
    } catch (error: unknown) {
      const resp = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errMsg =
        axiosResponseDataMessage(resp) ??
        (axios.isAxiosError(error) ? error.message : undefined) ??
        errorMessage(error) ??
        "Failed to create client link.";
      const detail = axiosResponseDetail(resp);
      setMessage({ type: "error", text: detail ? `${errMsg} Details: ${detail}` : errMsg });
      toast.error(errMsg);
    }
  }, [addMutate, vpnServerId, newExternalId, newCommonName, onSuccess, validate]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isPending) void handleSubmit();
    },
    [handleSubmit, isPending],
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

      <button className="btn primary" onClick={() => void handleSubmit()} disabled={isPending}>
        <FaPlus className="icon" />
        {isPending ? "Creating…" : "Create client link"}
      </button>

      <button
        className="btn secondary"
        type="button"
        onClick={() => navigate(`/servers/${vpnServerId}/ovpn-file-config/`)}
        disabled={isPending}
        title="VLESS client export template ({{vless_uri}}, etc.)"
      >
        <FaCog className="icon" />
        Edit export template
      </button>

      <p className="certificate-description" style={{ marginTop: 10, maxWidth: 720, lineHeight: 1.45 }}>
        Calls <code>/api/xray-client-links/add</code> → DataGateXRayManager. Not an <code>.ovpn</code> file. Template:
        server <strong>Client export template</strong>.
      </p>

      {message && (
        <p className={message.type === "success" ? "message-success" : "message-error"}>{message.text}</p>
      )}
    </div>
  );
};

export default AddXrayClientLink;
