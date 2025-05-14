import React, { useState, useEffect, useRef } from "react";
import { FaDatabase } from "react-icons/fa";
import { updateGeoLiteDatabase, getGeoLiteDatabaseVersion, getGeoLiteHubConnection } from "../utils/api";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";

export function GeoLiteDbDownloader() {
  const [version, setVersion] = useState<string>("Unknown");

  const [requestInProgress, setRequestInProgress] = useState(false);

  const [isUpdateRunning, setIsUpdateRunning] = useState(false);

  const [currentStepTitle, setCurrentStepTitle] = useState<string | null>(null);
  const [currentStepNumber, setCurrentStepNumber] = useState<number | null>(null);
  const [totalSteps, setTotalSteps] = useState<number | null>(null);
  const [stepProgress, setStepProgress] = useState<number | null>(null);

  const [isFetching, setIsFetching] = useState(true);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const fetchVersionAndConnect = async () => {
      setIsFetching(true); // ⏳ начинаем загрузку
      try {
        const versionResponse = await getGeoLiteDatabaseVersion();
        setVersion(versionResponse.version);
      } catch (err: any) {
        console.error("Failed to fetch version:", err);
      }

      try {
        const connection = await getGeoLiteHubConnection();
        connectionRef.current = connection;

        connection.on("GeoLiteStepProgress", (data) => {
          setCurrentStepNumber(data.step);
          setTotalSteps(data.totalSteps);
          setCurrentStepTitle(data.title);
          setStepProgress(data.progress);
          setIsUpdateRunning(true);
        });

        connection.on("GeoLiteUpdateFinished", async () => {
          setIsUpdateRunning(false);
          setCurrentStepTitle(null);
          setCurrentStepNumber(null);
          setTotalSteps(null);
          setStepProgress(null);

          try {
            const versionResponse = await getGeoLiteDatabaseVersion();
            setVersion(versionResponse.version);
            toast.success("GeoLite database update completed.");
          } catch (err) {
            toast.error("Update finished, but failed to load new version.");
          }

          setRequestInProgress(false);
        });

        await connection.start();
      } catch (err) {
        console.error("❌ SignalR connection error:", err);
      } finally {
        setIsFetching(false); // ✅ закончили
      }
    };

    fetchVersionAndConnect();

    return () => {
      connectionRef.current?.stop();
    };
  }, []);


  const handleUpdateGeoLite = async () => {
    try {
      setRequestInProgress(true);
      await updateGeoLiteDatabase();
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(err?.response?.data?.error || err.message || "Unknown error");
      setRequestInProgress(false);
    }
  };

  const updateInProgress = isUpdateRunning || requestInProgress;

if (isFetching) {
  return (
    <div className="geo-db-downloader" style={{ padding: "2rem", textAlign: "center" }}>
      <span className="spinner" style={{ width: 24, height: 24, display: "inline-block" }} />
      <p style={{ marginTop: "0.5rem", color: "#8b949e" }}>Loading status...</p>
    </div>
  );
}

return (
  <div className="geo-db-downloader" style={{ paddingTop: "1rem" }}>
    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>GeoLite2 Downloader</h3>

    <p style={{ fontSize: "0.95rem", color: "#c9d1d9" }}>
      <span style={{ color: "#8b949e" }}>Current DB Version:</span>{" "}
      <strong style={{ color: "#58a6ff" }}>{version}</strong>
    </p>

    {currentStepNumber !== null && currentStepTitle && (
      <div className="step-status" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#c9d1d9" }}>
          <strong>Step {currentStepNumber}/{totalSteps}:</strong> {currentStepTitle}
        </div>
        {stepProgress !== null && (
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#21262d",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)"
            }}
          >
            <div
              style={{
                width: `${stepProgress}%`,
                height: "100%",
                backgroundColor: "#58a6ff",
                transition: "width 0.3s ease-in-out",
                marginBottom: "2px",
              }}
            />
          </div>
        )}
      </div>
    )}

    <button
      className="btn primary"
      onClick={handleUpdateGeoLite}
      disabled={updateInProgress}
    >
      {updateInProgress ? (
        <span className="spinner" style={{ marginRight: "8px" }}></span>
      ) : (
        FaDatabase({ className: "icon", style: { marginRight: "8px" } })
      )}
      {updateInProgress ? "Updating..." : "Update GeoLite2 Database"}
    </button>
  </div>
);
}