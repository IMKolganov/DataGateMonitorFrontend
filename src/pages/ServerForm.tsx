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
    IsOnline: false,
    isDefault: false,
    ApiUrl: "",
    LastUpdate: new Date().toISOString(),
    CreateDate: new Date().toISOString(),
  });

  const [errors, setErrors] = useState({
    ServerName: ""
  });

  useEffect(() => {
    if (serverId) {
      getServer(serverId)
        .then((data) => {
          setServerData({
            Id: data.id,
            ServerName: data.serverName || "",
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
      [name]: value,
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ServerName: "" };

    if (!serverData.ServerName.trim()) {
      newErrors.ServerName = "Server name is required.";
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
