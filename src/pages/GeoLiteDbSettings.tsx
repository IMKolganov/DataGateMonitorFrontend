import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "../css/Settings.css";
import {
  getSetting,
  setSetting,
  getGeoLiteDatabaseVersion
} from "../utils/api";
import { FaSave } from "react-icons/fa";
import { GeoLiteDbDownloader } from "./GeoLiteDbDownloader";

export function GeoLiteDbSettings() {
  const [geoIpAccountId, setGeoIpAccountId] = useState("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState("Fetching...");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setInitialLoading(true);
      setGeoIpDbPath(await getSetting("GeoIp_Db_Path").then(res => res?.value || ""));
      setGeoIpDownloadUrl(await getSetting("GeoIp_Download_Url").then(res => res?.value || ""));
      setGeoIpAccountId(await getSetting("GeoIp_Account_ID").then(res => res?.value || ""));
      setGeoIpLicenseKey(await getSetting("GeoIp_License_Key").then(res => res?.value || ""));
    } catch (err) {
      console.error("Error loading GeoLite settings:", err);
      toast.error("Failed to load settings.");
    } finally {
      setInitialLoading(false);
    }

    try {
      await getGeoLiteDatabaseVersion();
      // you may want to store/display this version if needed
    } catch (err) {
      console.error("Error getting GeoLite version:", err);
      toast.error("Failed to fetch GeoLite version.");
    }
  };


  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string, value: any, type: string) => {
    try {
      setLoading(true);

      await setSetting(key, type === "number" ? String(value) : value, type);

      toast.success(`${key} successfully updated.`);

      await fetchSettings();
    } catch (err: any) {
      console.error(`Error saving ${key}:`, err);

      const message = err.response?.data?.error || err.message || "Unknown error";
      toast.error(`Failed to save ${key}: ${message}`);
    } finally {
      setLoading(false);
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
            {FaSave({ className: "icon" })} Save
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
            {FaSave({ className: "icon" })} Save
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
            {FaSave({ className: "icon" })} Save
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
            {FaSave({ className: "icon" })} Save
          </button>
        </div>
      </div>
      <h2>GeoLite2 Downloader</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <GeoLiteDbDownloader />

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
          </a>.
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