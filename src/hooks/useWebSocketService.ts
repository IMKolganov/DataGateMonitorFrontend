import { useState, useEffect, useCallback } from "react";
import { fetchConfig, getWebSocketUrlForBackgroundService, runServiceNow } from "../utils/api";
import type { ServiceStatus } from "../utils/types";

interface ServiceData {
  vpnServerId: number;
  status: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
}

const useWebSocketService = () => {
  const [serviceData, setServiceData] = useState<Record<string, ServiceData>>({});
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
        console.error("Failed to initialize WebSocket:", error);
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
        const data: any[] = JSON.parse(event.data);
    
        if (!Array.isArray(data)) return;
    
        const updatedServiceData: Record<string, ServiceData> = {};
    
        data.forEach((service) => {
          const status =
            service.Status === 0 ? ServiceStatus.Idle :
            service.Status === 1 ? ServiceStatus.Running :
            ServiceStatus.Error;
    
          updatedServiceData[service.VpnServerId] = {
            vpnServerId: service.VpnServerId,
            status,
            errorMessage: service.ErrorMessage || null,
            nextRunTime: service.NextRunTime || "N/A",
          };
        });
    
        setServiceData(updatedServiceData);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };    

    socket.onclose = () => {
      setTimeout(() => connectWebSocket(wsUrl), 5000);
    };

    setWs(socket);
  }, []);

  return { serviceData, runServiceNow };
};

export default useWebSocketService;
