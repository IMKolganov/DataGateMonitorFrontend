import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { fetchServerSettings, updateServerSettings } from "../utils/api";
import { toast } from "react-toastify";

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

  useEffect(() => {
    if (vpnServerId) {
      loadSettings(vpnServerId);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateServerSettings({ vpnServerId: vpnServerId!, ...settings });
      toast.success("Settings saved successfully");
      navigate(-1);
    } catch (err) {
      setError("Failed to save settings.");
      console.error("Error saving settings:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="content-wrapper wide-table">
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={() => navigate(`/servers/${vpnServerId}`)}>
            {FaArrowLeft({ className: "icon" })} Back
          </button>
        </div>
      </div>

      {error ? (
        <p className="error">{error}</p>
      ) : !settings ? (
        <p>No settings found.</p>
      ) : (
        <>
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
                {FaSave({ className: "icon" })} Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServerSettings;