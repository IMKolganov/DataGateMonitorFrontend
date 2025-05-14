import React, { useState, useEffect, useRef } from "react";
import { FaDatabase } from "react-icons/fa";
import { updateGeoLiteDatabase, getGeoLiteDatabaseVersion, getGeoLiteHubConnection } from "../utils/api";
import * as signalR from "@microsoft/signalr";

export function GeoLiteDbDownloader() {
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<string>("Unknown");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const fetchVersionAndConnect = async () => {
      try {
        const versionResponse = await getGeoLiteDatabaseVersion();
        setVersion(versionResponse.version);
      } catch (err: any) {
        console.error("Failed to fetch version:", err);
      }

      try {
        const connection = await getGeoLiteHubConnection();
        connectionRef.current = connection;

        connection.on("GeoLiteDownloadProgress", (percent: number) => {
          setProgress(percent);
        });

        await connection.start();
      } catch (err) {
        console.error("❌ SignalR connection error:", err);
      }
    };

    fetchVersionAndConnect();

    return () => {
      connectionRef.current?.stop();
    };
  }, []);

  const handleUpdateGeoLite = async () => {
    try {
      setProgress(0);
      setLoading(true);
      setSuccessMessage(null);
      setError(null);

      await updateGeoLiteDatabase();
      const versionResponse = await getGeoLiteDatabaseVersion();
      setVersion(versionResponse.version);
      setSuccessMessage("GeoLite database successfully updated.");
    } catch (err: any) {
      console.error("Update failed:", err);
      setError(err?.response?.data?.error || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="geo-db-downloader">
      <h3>GeoLite2 Downloader</h3>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error}</p>}

      <p>Current DB Version: {version}</p>

      {progress !== null && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}>
            {progress.toFixed(0)}%
          </div>
        </div>
      )}

      <button className="btn primary" onClick={handleUpdateGeoLite} disabled={loading}>
        {FaDatabase({ className: "icon" })} Update GeoLite2 Database
      </button>
    </div>
  );
}

export default GeoLiteDbDownloader;
