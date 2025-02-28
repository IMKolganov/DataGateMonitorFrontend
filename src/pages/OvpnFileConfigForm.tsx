import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { getOvpnFileConfig, saveOvpnFileConfig } from "../utils/api";
import { FaPlus, FaCopy, FaArrowLeft } from "react-icons/fa";

const OvpnFileConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId?: string }>();

  const [ovpnFileConfig, setServerConfig] = useState({
    Id: 0,
    ServerId: serverId ? Number(serverId) : 0,
    VpnServerIp: "",
    VpnServerPort: 1194,
    ConfigTemplate: "",
    LastUpdate: new Date().toISOString(),
    CreateDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<{ VpnServerIp: string; VpnServerPort: string; apiError?: string }>({
    VpnServerIp: "",
    VpnServerPort: "",
  });

  const [copyStatus, setCopyStatus] = useState<"Copy" | "Copied!">("Copy");

  useEffect(() => {
    if (serverId) {
      getOvpnFileConfig(serverId)
        .then((data) => {
          setServerConfig({
            Id: data.id,
            ServerId: data.serverId || Number(serverId),
            VpnServerIp: data.vpnServerIp || "",
            VpnServerPort: Number(data.vpnServerPort) || 1194,
            ConfigTemplate: data.configTemplate || "",
            LastUpdate: data.lastUpdate || new Date().toISOString(),
            CreateDate: data.createDate || new Date().toISOString(),
          });
        })
        .catch((error) => {
          console.error("Error loading server config data:", error);
          setErrors((prev) => ({ ...prev, apiError: "Failed to load VPN server configuration." }));
        });
    }
  }, [serverId]);

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
    if (!ovpnFileConfig.VpnServerPort || ovpnFileConfig.VpnServerPort < 1 || ovpnFileConfig.VpnServerPort > 65535) {
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
      console.error("Failed to copy text:", err);
      setCopyStatus("Copy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const configToSend = {
        ...ovpnFileConfig,
        ServerId: ovpnFileConfig.ServerId || Number(serverId) || 0,
      };

      await saveOvpnFileConfig(configToSend);
      setErrors({ VpnServerIp: "", VpnServerPort: "" });
      navigate(`/server-details/${serverId}/certificates`);
    } catch (error: any) {
      console.error("Error saving server config:", error);
      let errorMessage = "Failed to save VPN server configuration.";

      if (error.response?.data) {
        errorMessage = error.response.data.Message || errorMessage;
        if (error.response.data.Detail) {
          errorMessage += ` Details: ${error.response.data.Detail}`;
        }
      }

      setErrors((prev) => ({ ...prev, apiError: errorMessage }));
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <div className="server-form-container">
        <h2 className="server-form-header">{serverId ? "Edit Ovpn File Config" : "Add New Ovpn File Config"}</h2>
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
                  <FaCopy /> {copyStatus}
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

          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button className="btn secondary" onClick={() => navigate(`/server-details/${serverId}/certificates`)}>
                  <FaArrowLeft className="icon" /> Back
                </button>                
              </div>
              <div className="right-buttons">
              <button type="submit" className="submit-button">
                  <FaPlus className="icon" /> {serverId ? "Update Config" : "Add Config"}
              </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OvpnFileConfigForm;
