import React, { useState, useEffect } from "react";
import { FaSave, FaDatabase } from "react-icons/fa";
import "../css/Settings.css";
import {
  getSetting,
  setSetting,
  getGeoLiteDatabaseVersion,
  updateGeoLiteDatabase
} from "../utils/api";

export function GeoLiteDbSettings() {
  const [geoIpAccountId, setGeoIpAccountId] = useState("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState("Fetching...");
  const [geoLiteVersion, setGeoLiteVersion] = useState<string>("Fetching...");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setInitialLoading(true);
        setGeoIpDbPath(await getSetting("GeoIp_Db_Path").then(res => res?.value || ""));
        setGeoIpDownloadUrl(await getSetting("GeoIp_Download_Url").then(res => res?.value || ""));
        setGeoIpAccountId(await getSetting("GeoIp_Account_ID").then(res => res?.value || ""));
        setGeoIpLicenseKey(await getSetting("GeoIp_License_Key").then(res => res?.value || ""));
      } catch (err) {
        console.error("Error loading GeoLite settings:", err);
        setError("Failed to load settings.");
      } finally {
        setInitialLoading(false);
      }

      try {
        const version = await getGeoLiteDatabaseVersion();
        setGeoLiteVersion(version.version);
      } catch (err) {
        console.error("Error getting GeoLite version:", err);
        setError("Failed to fetch GeoLite version.");
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
      console.error("Error updating GeoLite DB:", err);
      setError("Database update failed");
      setErrorDetails(err.response?.data?.error || err.message);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }

    try {
      const version = await getGeoLiteDatabaseVersion();
      setGeoLiteVersion(version.version);
    } catch (err: any) {
      console.error("Error getting updated version:", err);
      setError("Failed to refresh GeoLite version.");
      setErrorDetails(err.response?.data?.error || err.message);
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading GeoLite settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>GeoLite2 Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && (
        <p className="error-message">
          {error}
          <br />
          Details: {errorDetails}
        </p>
      )}

      <div className="settings-group">
        <h4>GeoIP Database Path:</h4>
        <div className="settings-item">
          <input
            type="text"
            value={geoIpDbPath}
            onChange={(e) => setGeoIpDbPath(e.target.value)}
            className="input"
          />
          <button
            className="btn primary"
            onClick={() => handleSave("GeoIp_Db_Path", geoIpDbPath, "string")}
            disabled={loading}
          >
            <FaSave className="icon" /> Save
          </button>
        </div>

        <h4>GeoIP Download URL:</h4>
        <div className="settings-item">
          <input
            type="text"
            value={geoIpDownloadUrl}
            onChange={(e) => setGeoIpDownloadUrl(e.target.value)}
            className="input"
          />
          <button
            className="btn primary"
            onClick={() => handleSave("GeoIp_Download_Url", geoIpDownloadUrl, "string")}
            disabled={loading}
          >
            <FaSave className="icon" /> Save
          </button>
        </div>

        <h4>GeoIP Account ID:</h4>
        <div className="settings-item">
          <input
            type="text"
            value={geoIpAccountId}
            onChange={(e) => setGeoIpAccountId(e.target.value)}
            className="input"
          />
          <button
            className="btn primary"
            onClick={() => handleSave("GeoIp_Account_ID", geoIpAccountId, "string")}
            disabled={loading}
          >
            <FaSave className="icon" /> Save
          </button>
        </div>

        <h4>GeoIP License Key:</h4>
        <div className="settings-item">
          <input
            type="text"
            value={geoIpLicenseKey}
            onChange={(e) => setGeoIpLicenseKey(e.target.value)}
            className="input"
          />
          <button
            className="btn primary"
            onClick={() => handleSave("GeoIp_License_Key", geoIpLicenseKey, "string")}
            disabled={loading}
          >
            <FaSave className="icon" /> Save
          </button>
        </div>

        <h4>Current GeoLite Version:</h4>
        <div className="settings-item">
          <input type="text" value={geoLiteVersion} readOnly className="input" />
          <button className="btn primary" onClick={handleUpdateGeoLite} disabled={loading}>
            <FaDatabase className="icon" /> Update Database
          </button>
        </div>
        <p className="settings-item-description">
          MaxMind allows up to 30 updates per day. Exceeding this limit may cause errors.
        </p>
      </div>

      <div className="db-info">
        <p className="db-description">
          This setting points to the <strong>GeoLite2-City</strong> DB used for IP geolocation.
          Provided by{" "}
          <a
            href="https://www.maxmind.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#58a6ff" }}
          >
            MaxMind
          </a>
          .
        </p>
        <p className="db-update">
          <strong>How it works:</strong> OpenVPN clients’ IP addresses are matched against this DB
          to determine approximate geo-info for analytics and security.
        </p>
        <p className="db-update">
          <strong>Manual update:</strong> Visit{" "}
          <a
            href="https://dev.maxmind.com/geoip/geolite2-free-geolocation-data"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#58a6ff" }}
          >
            MaxMind’s GeoLite2 DB page
          </a>{" "}
          and replace the file manually.
        </p>
      </div>
    </div>
  );
}

export default GeoLiteDbSettings;