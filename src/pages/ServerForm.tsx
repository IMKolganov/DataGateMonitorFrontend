import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import { fetchConfig } from "../utils/api";

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId?: string }>();
  const [config, setConfig] = useState<{ apiBaseUrl: string } | null>(null);

  const [serverData, setServerData] = useState({
    Id: serverId ? parseInt(serverId) : 0,
    ServerName: "",
    ManagementIp: "",
    ManagementPort: 1194,
    Login: "",
    Password: "",
    IsOnline: false,
    LastUpdate: new Date().toISOString(),
    CreateDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState({
    ServerName: "",
    ManagementIp: "",
    ManagementPort: "",
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const loadedConfig = await fetchConfig();
        setConfig(loadedConfig);
      } catch (error) {
        console.error("Failed to load configuration:", error);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (config && serverId) {
      fetch(`${config.apiBaseUrl}/OpenVpnServers/GetServer/${serverId}`)
        .then(response => {
          if (!response.ok) throw new Error("Failed to fetch server data");
          return response.json();
        })
        .then(data => {
          console.log("Received data:", data);

          setServerData(prev => ({
            ...prev,
            Id: data.id,
            ServerName: data.serverName || "",
            ManagementIp: data.managementIp || "",
            ManagementPort: Number(data.managementPort) || 1194,
            Login: data.login || "",
            Password: data.password || "",
            IsOnline: data.isOnline,
            LastUpdate: data.lastUpdate || new Date().toISOString(),
            CreateDate: data.createDate || new Date().toISOString(),
          }));
        })
        .catch(error => console.error("Error loading server data:", error));
    }
  }, [config, serverId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServerData(prev => ({
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
    if (!validateForm() || !config) return;

    try {
      const isEditing = !!serverId;
      const url = isEditing
        ? `${config.apiBaseUrl}/OpenVpnServers/UpdateServer`
        : `${config.apiBaseUrl}/OpenVpnServers/AddServer`;
      const method = isEditing ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serverData),
      });

      if (!response.ok) {
        throw new Error(isEditing ? "Failed to update server" : "Failed to add server");
      }

      alert(isEditing ? "Server updated successfully!" : "Server added successfully!");
      navigate("/");
    } catch (error) {
      console.error(serverId ? "Error updating server:" : "Error adding server:", error);
      alert(serverId ? "Failed to update server." : "Failed to add server.");
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <div className="server-form-container">
        <h2 className="server-form-header">{serverId ? "Edit Server" : "Add New Server"}</h2>
        <p className="server-form-description">
          {serverId 
            ? "Modify the server details below and click 'Update Server' to save changes." 
            : "Please fill out the form below to add a new VPN server."}
        </p>
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

          <div className="form-actions">
            <button type="button" className="back-button" onClick={() => navigate("/")}>
              Back
            </button>
            <button type="submit" className="submit-button">
              {serverId ? "Update Server" : "Add Server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServerForm;
