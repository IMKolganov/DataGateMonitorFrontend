import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { fetchServerSettings, updateServerSettings, fetchDatabasePath } from "../utils/api";

import "../css/ServerSettings.css";

const fieldDescriptions: { [key: string]: string } = {
  easyRsaPath: "Path to the EasyRSA directory used for managing certificates.",
  ovpnFileDir: "Directory where client OpenVPN configuration files are stored.",
  revokedOvpnFilesDirPath: "Directory where revoked OpenVPN client configuration files are moved.",
  pkiPath: "Path to the PKI directory used by EasyRSA.",
  caCertPath: "Path to the Certificate Authority (CA) certificate.",
  tlsAuthKey: "Path to the TLS authentication key used for extra security.",
  serverRemoteIp: "Public IP address of the OpenVPN server.",
  crlPkiPath: "Path to the Certificate Revocation List (CRL) file in the PKI directory.",
  crlOpenvpnPath: "Path to the CRL file used by OpenVPN.",
  statusFilePath: "Path to the OpenVPN status log file.",
};

const hiddenFields = ["id", "vpnServerId", "lastUpdate", "createDate"];

const formatFieldName = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const ServerSettings: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);

  useEffect(() => {
    if (vpnServerId) {
      loadSettings(vpnServerId);
      loadDatabasePath();
    }
  }, [vpnServerId]);

  const loadSettings = async (serverId: string) => {
    setLoading(true);
    try {
      const data = await fetchServerSettings(serverId);
      setSettings(data);
    } catch (err) {
      setError("Failed to load server settings.");
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabasePath = async () => {
    try {
      const path = await fetchDatabasePath();
      setDbPath(path);
    } catch (err) {
      console.error("Error fetching database path:", err);
      setDbPath("Failed to fetch database path.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateServerSettings({ vpnServerId: vpnServerId!, ...settings });
      alert("Settings saved successfully");
      navigate(-1);
    } catch (err) {
      setError("Failed to save settings.");
      console.error("Error saving settings:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!settings) return <p>No settings found.</p>;

  return (
    <div className="settings-container">
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={() => navigate(`/server-details/${vpnServerId}`)}>
            <FaArrowLeft className="icon" /> Back
          </button>
        </div>
      </div>
      <h2>Server Settings</h2>
      <div className="settings-form">
        {Object.keys(settings)
          .filter((key) => !hiddenFields.includes(key))
          .map((key) => (
            <div key={key} className="form-group">
              <label htmlFor={key} className="field-label">
                {formatFieldName(key)}
              </label>
              <p className="field-description">
                {fieldDescriptions[key] || "No description available."}
              </p>
              <input
                type="text"
                id={key}
                name={key}
                value={settings[key] || ""}
                onChange={handleChange}
                className="input"
              />
            </div>
          ))}
          <div className="action-buttons">
            <button className="btn primary" onClick={handleSave} disabled={loading}>
              <FaSave className="icon" /> Save
            </button>
          </div>

        
        {dbPath && (
          <div className="db-info">
            <h2>Geo Ip</h2>
            <p className="db-path">
              <strong>Database Path:</strong> {dbPath}
            </p>
            <p className="db-description">
              This path points to the <strong>GeoLite2-City</strong> database file, which is used for **IP geolocation** in OpenVPN monitoring.  
              The database is provided by <a href="https://www.maxmind.com" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>MaxMind</a> and contains mappings between **IP addresses and geographic locations**.
            </p>
            <p className="db-update">
              <strong>How it works:</strong> When a client connects to the OpenVPN server, their **IP address is checked** against this database  
              to determine the **approximate country, city, and ISP**. This information helps in security monitoring and analytics.
            </p>
            <p className="db-update">
              <strong>How to update:</strong> MaxMind updates this database **every week**. To update it manually,  
              download the latest version from 
              <a href="https://dev.maxmind.com/geoip/geolite2-free-geolocation-data" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}> MaxMind’s GeoLite2 Database</a> and replace the file at this path.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ServerSettings;
