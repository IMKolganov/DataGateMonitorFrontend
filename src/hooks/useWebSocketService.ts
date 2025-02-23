import { useState, useEffect, useCallback } from "react";
import { fetchConfig, getWebSocketUrlForBackgroundService, runServiceNow } from "../utils/api";

const useWebSocketService = () => {
  const [serviceStatus, setServiceStatus] = useState<string>("Unknown");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextRunTime, setNextRunTime] = useState<string>("N/A");
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeWebSocket = async () => {
      try {
        await fetchConfig();
        const wsUrl = await getWebSocketUrlForBackgroundService();
        if (!isMounted) return;
        connectWebSocket(wsUrl);
      } catch (error) {
        console.error("❌ Failed to initialize WebSocket:", error);
      }
    };

    initializeWebSocket();

    return () => {
      isMounted = false;
      ws?.close();
    };
  }, []);

  const connectWebSocket = useCallback((wsUrl: string) => {
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔹 WebSocket received:", data);

        setServiceStatus(data.status || "Unknown");
        setErrorMessage(data.errorMessage || null);

        if (!data.nextRunTime) {
          console.warn("⚠️ WARNING: Server returned `nextRunTime` as null or undefined. Using 'N/A'");
          setNextRunTime("N/A");
          return;
        }

        setNextRunTime(data.nextRunTime); // Просто сохраняем дату, не трогаем формат
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.warn("⚠️ WebSocket disconnected, retrying in 5 seconds...");
      setTimeout(() => connectWebSocket(wsUrl), 5000);
    };

    setWs(socket);
  }, []);

  return { serviceStatus, nextRunTime, errorMessage, runServiceNow };
};

export default useWebSocketService;
