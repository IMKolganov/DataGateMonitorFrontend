import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import { getServer, saveServer } from "../utils/api";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId?: string }>();

  const [serverData, setServerData] = useState({
    Id: serverId ? parseInt(serverId) : 0,
    ServerName: "",
    ManagementIp: "",
    ManagementPort: 1194,
    Login: "",
    Password: "",
    IsOnline: false,
    isDefault: false,
    ApiUrl: "",
    LastUpdate: new Date().toISOString(),
    CreateDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState({
    ServerName: "",
    ManagementIp: "",
    ManagementPort: "",
  });

  useEffect(() => {
    if (serverId) {
      getServer(serverId)
        .then((data) => {
          setServerData({
            Id: data.id,
            ServerName: data.serverName || "",
            ManagementIp: data.managementIp || "",
            ManagementPort: Number(data.managementPort) || 1194,
            Login: data.login || "",
            Password: data.password || "",
            IsOnline: data.isOnline,
            isDefault: data.isDefault,
            ApiUrl: data.apiUrl || "",
            LastUpdate: data.lastUpdate || new Date().toISOString(),
            CreateDate: data.createDate || new Date().toISOString(),
          });
        })
        .catch((error) => console.error("Error loading server data:", error));
    }
  }, [serverId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServerData((prev) => ({
      ...prev,
      [name]: name === "ManagementPort" ? Number(value) : value,
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ServerName: "", ManagementIp: "", ManagementPort: "" };

    if (!serverData.ServerName.trim()) {
      newErrors.ServerName = "Server name is required.";
      isValid = false;
    }
    if (!serverData.ManagementIp.trim()) {
      newErrors.ManagementIp = "Management IP is required.";
      isValid = false;
    }
    if (!serverData.ManagementPort || serverData.ManagementPort < 1 || serverData.ManagementPort > 65535) {
      newErrors.ManagementPort = "Management Port must be between 1 and 65535.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await saveServer(serverData, !!serverId);
      toast.success(serverId ? "Server updated successfully!" : "Server added successfully!");
      navigate("/");
    } catch (error) {
      console.error(serverId ? "Error updating server:" : "Error adding server:", error);
      toast.error(serverId ? "Failed to update server." : "Failed to add server.");
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setServerData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  return (
    <div className="content-wrapper wide-table">
      <div className="server-form-container">
        <h2 className="server-form-header">{serverId ? "Edit Server" : "Add New Server"}</h2>
        <form className="server-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ServerName">Server Name *</label>
            <input
              type="text"
              id="ServerName"
              name="ServerName"
              value={serverData.ServerName}
              onChange={handleChange}
              className={errors.ServerName ? "input-error" : ""}
              placeholder="Enter server name"
            />
            {errors.ServerName && <p className="error-message">{errors.ServerName}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="ManagementIp">Management IP *</label>
            <input
              type="text"
              id="ManagementIp"
              name="ManagementIp"
              value={serverData.ManagementIp}
              onChange={handleChange}
              className={errors.ManagementIp ? "input-error" : ""}
              placeholder="Enter Management IP address"
            />
            {errors.ManagementIp && <p className="error-message">{errors.ManagementIp}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="ManagementPort">Management Port *</label>
            <input
              type="number"
              id="ManagementPort"
              name="ManagementPort"
              value={serverData.ManagementPort}
              onChange={handleChange}
              className={errors.ManagementPort ? "input-error" : ""}
              placeholder="Enter Management Port"
            />
            {errors.ManagementPort && <p className="error-message">{errors.ManagementPort}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="Login">Login</label>
            <input
              type="text"
              id="Login"
              name="Login"
              value={serverData.Login}
              onChange={handleChange}
              placeholder="Enter login (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="Password">Password</label>
            <input
              type="password"
              id="Password"
              name="Password"
              value={serverData.Password}
              onChange={handleChange}
              placeholder="Enter password (optional)"
            />
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={serverData.isDefault}
                onChange={handleCheckboxChange}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Default Server</span>
                <span className="checkbox-description">
                  Mark this server as the default entry point for clients connecting to your OpenVPN network.
                </span>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="ApiUrl">API url</label>
            <input
              type="text"
              id="ApiUrl"
              name="ApiUrl"
              value={serverData.ApiUrl}
              onChange={handleChange}
              placeholder="Enter API url (optional)"
            />
          </div>

          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button type="button" className="btn secondary" onClick={() => navigate(`/`)}>
                  {FaArrowLeft({ className: "icon" })} Back
                </button>
              </div>
              <div className="right-buttons">
                <button type="submit" className="submit-button">
                  {FaPlus({ className: "icon" })} {serverId ? "Update Server" : "Add Server"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServerForm;
