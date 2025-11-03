// src/pages/OvpnFileConfigForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { FaPlus, FaCopy, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";

import type {
  AddOrUpdateOvpnFileConfigRequest,
  OvpnFileConfigResponse,
} from "../api/orval/model";

const OvpnFileConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const parsedVpnServerId = Number(vpnServerId) || 0;

  // local UI state (kept in PascalCase to match form field names)
  const [ovpnFileConfig, setServerConfig] = useState({
    Id: 0,
    VpnServerId: parsedVpnServerId,
    VpnServerIp: "",
    VpnServerPort: 1194,
    ConfigTemplate: "",
  });

  const [errors, setErrors] = useState<{ VpnServerIp: string; VpnServerPort: string; apiError?: string }>({
    VpnServerIp: "",
    VpnServerPort: "",
  });

  const [copyStatus, setCopyStatus] = useState<"Copy" | "Copied!">("Copy");

  // load config via orval hook (auto-unwrapped response)
  const {
    data,
    isFetching,
    isError,
    error,
  } = useGetApiOpenVpnConfigsGetVpnServerId<OvpnFileConfigResponse>(
    parsedVpnServerId,
    {
      query: {
        enabled: parsedVpnServerId > 0, // skip for "create new" w/o id
        // tune as you wish
        staleTime: 0,
        retry: 1,
      },
    },
  );

  // mutation for save
  const saveMutation = usePostApiOpenVpnConfigsAddUpdate();

  // when data arrives, map to local PascalCase state
  useEffect(() => {
    if (!data) return;
    setServerConfig((prev) => ({
      ...prev,
      Id: data.id ?? 0,
      VpnServerId: data.vpnServerId ?? parsedVpnServerId,
      VpnServerIp: data.vpnServerIp ?? "",
      VpnServerPort: Number(data.vpnServerPort ?? 1194),
      ConfigTemplate: data.configTemplate ?? "",
    }));
  }, [data, parsedVpnServerId]);

  const loading = useMemo(() => isFetching || saveMutation.isPending, [isFetching, saveMutation.isPending]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setServerConfig((prev) => ({
      ...prev,
      [name]: name === "VpnServerPort" ? Number(value) : value,
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { VpnServerIp: "", VpnServerPort: "" };

    if (!ovpnFileConfig.VpnServerIp.trim()) {
      newErrors.VpnServerIp = "VPN Server IP is required.";
      isValid = false;
    }
    if (
      !ovpnFileConfig.VpnServerPort ||
      ovpnFileConfig.VpnServerPort < 1 ||
      ovpnFileConfig.VpnServerPort > 65535
    ) {
      newErrors.VpnServerPort = "VPN Server Port must be between 1 and 65535.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus("Copy"), 2000);
    } catch {
      toast.error("Failed to copy text");
      setCopyStatus("Copy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload: AddOrUpdateOvpnFileConfigRequest = {
        vpnServerId: ovpnFileConfig.VpnServerId || parsedVpnServerId,
        vpnServerIp: ovpnFileConfig.VpnServerIp.trim(),
        vpnServerPort: ovpnFileConfig.VpnServerPort,
        configTemplate: ovpnFileConfig.ConfigTemplate,
      };

      await saveMutation.mutateAsync({ data: payload });

      setErrors({ VpnServerIp: "", VpnServerPort: "" });
      toast.success("OpenVPN file config saved");
      navigate(`/servers/${parsedVpnServerId}/certificates`);
    } catch (err: any) {
      // orval/ogmMutator returns unwrapped; apiRequest errors likely set .response?.data
      let errorMessage = "Failed to save VPN server configuration.";
      const resp = err?.response?.data ?? err?.data ?? err;
      if (resp) {
        const msg = resp.message || resp.Message;
        const detail = resp.detail || resp.Detail;
        if (msg) errorMessage = msg;
        if (detail) errorMessage += ` Details: ${detail}`;
      }
      toast.error(errorMessage);
      setErrors((prev) => ({ ...prev, apiError: errorMessage }));
    }
  };

  return (
    <div>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      ) : (
        <div className="server-form-container">
          <h2 className="server-form-header">
            {vpnServerId ? "Edit OpenVPN File Config" : "Add New Ovpn File Config"}
          </h2>

          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate(`/servers/${parsedVpnServerId}/certificates`)}
                >
                  {FaArrowLeft({ className: "icon" })} Back
                </button>
              </div>
              <div className="right-buttons">
                <button type="button" className="btn secondary" onClick={handleSubmit}>
                  {FaPlus({ className: "icon" })} {vpnServerId ? "Update Config" : "Add Config"}
                </button>
              </div>
            </div>
          </div>

          {isError && (
            <p className="error-message">
              {(error as any)?.message ?? "Failed to load VPN server configuration."}
            </p>
          )}
          {errors.apiError && <p className="error-message">{errors.apiError}</p>}

          <form className="server-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="VpnServerIp">VPN Server IP *</label>
              <input
                type="text"
                id="VpnServerIp"
                name="VpnServerIp"
                value={ovpnFileConfig.VpnServerIp}
                onChange={handleChange}
                className={errors.VpnServerIp ? "input-error" : ""}
                placeholder="Enter VPN Server IP"
              />
              {errors.VpnServerIp && <p className="error-message">{errors.VpnServerIp}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="VpnServerPort">VPN Server Port *</label>
              <input
                type="number"
                id="VpnServerPort"
                name="VpnServerPort"
                value={ovpnFileConfig.VpnServerPort}
                onChange={handleChange}
                className={errors.VpnServerPort ? "input-error" : ""}
                placeholder="Enter VPN Server Port"
              />
              {errors.VpnServerPort && <p className="error-message">{errors.VpnServerPort}</p>}
            </div>

            <div className="form-group">
              <div className="config-template-container">
                <div className="toolbar">
                  <span>Config Template</span>
                  <button
                    className="copy-button"
                    type="button"
                    onClick={() => handleCopy(ovpnFileConfig.ConfigTemplate)}
                  >
                    {FaCopy({})} {copyStatus}
                  </button>
                </div>
                <textarea
                  id="ConfigTemplate"
                  name="ConfigTemplate"
                  value={ovpnFileConfig.ConfigTemplate}
                  onChange={handleChange}
                  placeholder="Enter config template"
                />
              </div>
            </div>
          </form>

          <div className="form-hint-container">
            <h4>What are these settings?</h4>
            <p>
              <strong>VPN Server IP</strong> — the public IP address or domain name of your OpenVPN server. This value is
              inserted into the generated .ovpn configuration file, allowing clients to connect to the correct server.
            </p>
            <p>
              <strong>VPN Server Port</strong> — the port your OpenVPN server is configured to listen on (usually <code>1194</code>).
              This must match the <code>port</code> directive in your <code>server.conf</code> (or <code>openvpn.conf</code>) file.
            </p>
            <p>⚠️ If the IP or port are incorrect, VPN clients will not be able to connect.</p>

            <h4>What is the OpenVPN Config Template?</h4>
            <p>
              The <strong>Config Template</strong> defines how the generated <code>.ovpn</code> file will look.
              You can include dynamic placeholders like <code>{"{{server_ip}}"}</code>, <code>{"{{client_cert}}"}</code>, etc.
            </p>
            <p>These placeholders will be replaced with actual values when generating client configs:</p>
            <pre className="ovpn-template-sample">
{`client
dev tun
proto tcp
remote {{server_ip}} {{server_port}}
resolv-retry infinite
nobind
remote-cert-tls server
tls-version-min 1.2
cipher AES-256-CBC
auth SHA256
auth-nocache
verb 3
<ca>
{{ca_cert}}
</ca>
<cert>
{{client_cert}}
</cert>
<key>
{{client_key}}
</key>
<tls-crypt>
{{tls_auth_key}}
</tls-crypt>`}
            </pre>
            <p>
              ⚠️ Do not remove or change the placeholders unless you understand their purpose.
              Each one is automatically replaced with correct values for the selected VPN server and user certificate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvpnFileConfigForm;
