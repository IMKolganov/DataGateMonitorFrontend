import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { getOvpnFileConfig, saveOvpnFileConfig } from "../utils/api";
import { FaPlus, FaCopy, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";

const OvpnFileConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const parsedVpnServerId = Number(id) || 0;


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

  useEffect(() => {
    if (!parsedVpnServerId) return;

    getOvpnFileConfig(parsedVpnServerId)
      .then((data) => {
        setServerConfig((prev) => ({
          ...prev,
          VpnServerId: data.vpnServerId ?? parsedVpnServerId,
          VpnServerIp: data.vpnServerIp ?? "",
          VpnServerPort: Number(data.vpnServerPort) || 1194,
          ConfigTemplate: data.configTemplate ?? "",
          Id: data.id ?? 0,
        }));
      })
      .catch((error) => {
        toast.error("Error loading config:", error);
        setErrors((prev) => ({ ...prev, apiError: "Failed to load VPN server configuration." }));
      });
  }, [parsedVpnServerId]);

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
    } catch (err) {
      toast.error("Failed to copy text");
      setCopyStatus("Copy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const configToSend = {
        ...ovpnFileConfig,
        VpnServerId: ovpnFileConfig.VpnServerId || parsedVpnServerId,
      };

      await saveOvpnFileConfig(configToSend);
      setErrors({ VpnServerIp: "", VpnServerPort: "" });
      navigate(`/servers/${parsedVpnServerId}/certificates`);
    } catch (error: any) {
      let errorMessage = "Failed to save VPN server configuration.";
      if (error.response?.data) {
        errorMessage = error.response.data.Message || errorMessage;
        if (error.response.data.Detail) {
          errorMessage += ` Details: ${error.response.data.Detail}`;
        }
      }
      toast.error("Error saving config:", error);
      setErrors((prev) => ({ ...prev, apiError: errorMessage }));
    }
  };

  return (
    <div>
      <div className="server-form-container">
        <h2 className="server-form-header">
          {id ? "Edit Ovpn File Config" : "Add New Ovpn File Config"}
        </h2>
          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button type="button" className="btn secondary" onClick={() => navigate(`/servers/${parsedVpnServerId}/certificates`)}>
                  {FaArrowLeft({ className: "icon" })} Back
                </button>
              </div>
              <div className="right-buttons">
                <button type="submit" className="submit-button">
                  {FaPlus({ className: "icon" })} {id ? "Update Config" : "Add Config"}
                </button>
              </div>
            </div>
          </div>
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
                <button className="copy-button" type="button" onClick={() => handleCopy(ovpnFileConfig.ConfigTemplate)}>
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
    <strong>VPN Server IP</strong> — the public IP address or domain name of your OpenVPN server. This value is inserted
    into the generated .ovpn configuration file, allowing clients to connect to the correct server.
  </p>
  <p>
    <strong>VPN Server Port</strong> — the port your OpenVPN server is configured to listen on (usually <code>1194</code>).
    This must match the <code>port</code> directive in your <code>server.conf</code> (or <code>openvpn.conf</code>) file.
  </p>
  <p>
    ⚠️ If the IP or port are incorrect, VPN clients will not be able to connect.
  </p>
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
    </div>
  );
};

export default OvpnFileConfigForm;