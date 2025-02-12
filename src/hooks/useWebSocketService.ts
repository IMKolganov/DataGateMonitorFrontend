// src/hooks/useWebSocketService.ts
import { useState, useEffect } from "react";
import { Config } from "../utils/types"; // Импорт типов

const useWebSocketService = () => {
  const [serviceStatus, setServiceStatus] = useState<string>("Unknown");
  const [nextRunTime, setNextRunTime] = useState<string>("N/A");
  const [config, setConfig] = useState<Config | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      connectWebSocket();
    }
    return () => ws?.close();
  }, [config]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const connectWebSocket = () => {
    if (!config) return;

    const socket = new WebSocket(config.webSocketUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setServiceStatus(data.status || "Unknown");
        setNextRunTime(new Date(data.nextRunTime).toLocaleString() || "N/A");
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.warn("WebSocket disconnected, retrying in 5 seconds...");
      setTimeout(connectWebSocket, 5000);
    };

    setWs(socket);
  };

  const runServiceNow = async () => {
    if (!config) return;

    try {
      await fetch(`${config.apiBaseUrl}/OpenVpnServers/run-now`, { method: "POST" });
    } catch (error) {
      console.error("Error running service manually:", error);
    }
  };

  return { serviceStatus, nextRunTime, runServiceNow };
};

export default useWebSocketService;
