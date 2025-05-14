import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getGeoLiteHubConnection } from "../utils/api"; // путь поправь при необходимости

export default function SignalRClientPage() {
  const [progressManual, setProgressManual] = useState<number | null>(null);
  const [progressApi, setProgressApi] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [connectedManual, setConnectedManual] = useState(false);
  const [connectedApi, setConnectedApi] = useState(false);

  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImFkbWluIiwicm9sZSI6IkFwcCIsIm5iZiI6MTc0NzIyMzI4MiwiZXhwIjoxNzQ3MjI2ODgyLCJpYXQiOjE3NDcyMjMyODJ9.x6zGRNGM4qgzM5tA7qRU6r_SP0XQOWgy22sU7msbZVI"; // ⚠️ ВСТАВЬ ПОЛНЫЙ ТОКЕН
  const hubUrl = "/api/hubs/geoLite"; // ⚠️ ОБНОВИ ПРИ НЕОБХОДИМОСТИ

  useEffect(() => {
    // ───── Подключение вручную ─────
    const manualConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();


    manualConnection.on("GeoLiteDownloadProgress", (percent: number) => {
      logMessage(`[Manual] Progress: ${percent}%`);
      setProgressManual(percent);
    });

    manualConnection
      .start()
      .then(() => {
        logMessage("✅ [Manual] Connected to SignalR hub.");
        setConnectedManual(true);
      })
      .catch((err) => {
        logMessage(`❌ [Manual] Connection error: ${err.message}`);
      });

    // ───── Подключение через API ─────
    let apiConnection: signalR.HubConnection;

    getGeoLiteHubConnection()
      .then((conn) => {
        apiConnection = conn;

        logMessage(`[API] Connecting to: ${conn.baseUrl ?? "unknown (baseUrl not public)"}`);

        apiConnection.on("GeoLiteDownloadProgress", (percent: number) => {
          logMessage(`[API] Progress: ${percent}%`);
          setProgressApi(percent);
        });

        return apiConnection.start();
      })
      .then(() => {
        logMessage("✅ [API] Connected via getGeoLiteHubConnection().");
        setConnectedApi(true);
      })
      .catch((err) => {
        logMessage(`❌ [API] Connection error: ${err.message}`);
      });

    return () => {
      manualConnection?.stop();
      apiConnection?.stop();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logMessage = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} ${message}`]);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>SignalR Test Client</h1>

      <p>Status Manual: {connectedManual ? "✅ Connected" : "❌ Disconnected"}</p>
      <p>Status API: {connectedApi ? "✅ Connected" : "❌ Disconnected"}</p>

      <h2>Manual Progress: {progressManual !== null ? `${progressManual}%` : "No data"}</h2>
      <h2>API Progress: {progressApi !== null ? `${progressApi}%` : "No data"}</h2>

      <div
        style={{
          marginTop: "1rem",
          background: "#111",
          color: "#0f0",
          padding: "1rem",
          height: "300px",
          overflowY: "auto",
        }}
      >
        {log.map((entry, idx) => (
          <div key={idx}>{entry}</div>
        ))}
      </div>
    </div>
  );
}
