import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSave, FaDatabase } from "react-icons/fa";
import "../css/Settings.css";
import { getSetting, setSetting, getGeoLiteDatabaseVersion, updateGeoLiteDatabase } from "../utils/api";

export function Settings() {
  const navigate = useNavigate();
  const [intervalType, setIntervalType] = useState("seconds");
  const [intervalValue, setIntervalValue] = useState<number>(0);
  const [geoIpAccountId, setGeoIpAccountId] = useState("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState("Fetching...");
  const [geoLiteVersion, setGeoLiteVersion] = useState<string>("Fetching...");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const intervalSetting = await getSetting("OpenVPN_Polling_Interval");
        const intervalUnit = await getSetting("OpenVPN_Polling_Interval_Unit");
        if (intervalSetting && intervalUnit) {
          setIntervalValue(Number(intervalSetting.value));
          setIntervalType(intervalUnit.value);
        }
        setGeoIpDbPath(await getSetting("GeoIp_Db_Path").then(res => res?.value || ""));
        setGeoIpDownloadUrl(await getSetting("GeoIp_Download_Url").then(res => res?.value || ""));
        setGeoIpAccountId(await getSetting("GeoIp_Account_ID").then(res => res?.value || ""));
        setGeoIpLicenseKey(await getSetting("GeoIp_License_Key").then(res => res?.value || ""));
      
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }

      try {
        const version = await getGeoLiteDatabaseVersion();
        setGeoLiteVersion(version.version);
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Failed to load settings.");
      } 

    }
    fetchSettings();
  }, []);


  const handleSave = async (key: string, value: any, type: string) => {
    try {
      setLoading(true);
      await setSetting(key, type === "number" ? String(value) : value, type);
      setSuccessMessage(`${key} successfully updated.`);
      setError(null);
      setErrorDetails(null);
    } catch (err: any) {
      console.error(`Error saving ${key}:`, err);
      setError(`Failed to save ${key}.`);
      setErrorDetails(err.response?.data?.error || err.message);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGeoLite = async () => {
    try {
      setLoading(true);
      await updateGeoLiteDatabase();
      setSuccessMessage("GeoLite database successfully updated.");
      setError(null);
      setErrorDetails(null);
    } catch (err: any) {
      console.error("Error updating GeoLite database:", err);
      setError("Database update failed");
      setErrorDetails(err.response?.data?.error || err.message);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }

    try{
      const version = await getGeoLiteDatabaseVersion();
      setGeoLiteVersion(version.version);
    } catch (err: any) {
      console.error("Error updating GeoLite database:", err);
      setError("Database update failed");
      setErrorDetails(err.response?.data?.error || err.message);
      setSuccessMessage(null);
    }
  };

  return (
    <div className="content-wrapper wide-table settings">
      <h2>Settings</h2>
      <div className="header-container">
        <p className="settings-description">Configure system settings here.</p>
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}> 
              <FaArrowLeft className="icon" /> Back
            </button>
          </div>
        </div>
      </div>

      <ul className="settings-links">
        <li>
          <Link to="/settings/applications">Application Settings</Link>
          <p className="settings-item-description">
            Manage registered applications, generate API tokens, and configure access permissions.
          </p>
        </li>
      </ul>
      
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error} <br />Details: {errorDetails}</p>}

      <h2>OpenVPN Polling Interval</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <h4>OpenVPN Polling Interval:</h4>
      <div className="settings-item">
        <input type="number" value={intervalValue} onChange={(e) => setIntervalValue(Number(e.target.value))} className="input" />
        <select value={intervalType} onChange={(e) => setIntervalType(e.target.value)} className="btn secondary">
          <option value="seconds">Seconds</option>
          <option value="minutes">Minutes</option>
        </select>
        <button className="btn primary" onClick={() => handleSave("OpenVPN_Polling_Interval", intervalValue, "int")} disabled={loading}>
          <FaSave className="icon" /> Save
        </button>
      </div>
      <p className="settings-item-description">0 = disabled</p>

      
      <h2>GeoIP Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <h4>GeoIP Database Path:</h4>
      <div className="settings-item">
        <input type="text" value={geoIpDbPath} onChange={(e) => setGeoIpDbPath(e.target.value)} className="input" />
        <button className="btn primary" onClick={() => handleSave("GeoIp_Db_Path", geoIpDbPath, "string")} disabled={loading}>
          <FaSave className="icon" /> Save
        </button>
      </div>

      <h4>GeoIP Download URL:</h4>
      <div className="settings-item">
        <input type="text" value={geoIpDownloadUrl} onChange={(e) => setGeoIpDownloadUrl(e.target.value)} className="input" />
        <button className="btn primary" onClick={() => handleSave("GeoIp_Download_Url", geoIpDownloadUrl, "string")} disabled={loading}>
          <FaSave className="icon" /> Save
        </button>
      </div>

      <h4>GeoIP Account ID:</h4>
      <div className="settings-item">
        <input type="text" value={geoIpAccountId} onChange={(e) => setGeoIpAccountId(e.target.value)} className="input" />
        <button className="btn primary" onClick={() => handleSave("GeoIp_Account_ID", geoIpAccountId, "string")} disabled={loading}>
          <FaSave className="icon" /> Save
        </button>
      </div>
      <h4>GeoIP License Key:</h4>
      <div className="settings-item">
        <input type="text" value={geoIpLicenseKey} onChange={(e) => setGeoIpLicenseKey(e.target.value)} className="input" />
        <button className="btn primary" onClick={() => handleSave("GeoIp_License_Key", geoIpLicenseKey, "string")} disabled={loading}>
          <FaSave className="icon" /> Save
        </button>
      </div>

      <h4>Current Version:</h4>
      <div className="settings-item">
        <input type="text" value={geoLiteVersion} className="input" readOnly />
        <button className="btn primary" onClick={handleUpdateGeoLite} disabled={loading}>
          <FaDatabase className="icon" />Update Database
        </button>
      </div>
      <p className="settings-item-description">MaxMind API allows up to 30 database updates per day. Exceeding this limit may result in an error.</p>

      <div className="db-info">
        <p className="db-description">
          This settings points to the <strong>GeoLite2-City</strong> database file, which is used for IP geolocation in OpenVPN monitoring.  
          The database is provided by <a href="https://www.maxmind.com" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>MaxMind</a> and contains mappings between IP addresses and geographic locations.
        </p>
        <p className="db-update">
          <strong>How it works:</strong> When a client connects to the OpenVPN server, their IP address is checked against this database  
          to determine the approximate country, city, and ISP. This information helps in security monitoring and analytics.
        </p>
        <p className="db-update">
          <strong>How to update:</strong> MaxMind updates this database every week. To update it manually,  
          download the latest version from 
          <a href="https://dev.maxmind.com/geoip/geolite2-free-geolocation-data" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}> MaxMind’s GeoLite2 Database</a> and replace the file at this path.
        </p>
      </div>

    </div>
  );
}

export default Settings;
