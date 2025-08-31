import { useState, useEffect, useRef } from "react";
import { fetchConfig, getWebSocketUrlForBackgroundService, runServiceNow } from "../utils/api";
import { ServiceStatus } from "../utils/types";

interface ServiceData {
  vpnServerId: number;
  status: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  countConnectedClients?: number;
  countSessions?: number;
}

const useWebSocketService = () => {
  const [serviceData, setServiceData] = useState<Record<number, ServiceData>>({});
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    let socket: WebSocket | null = null;

    const initializeWebSocket = async () => {
      try {
        await fetchConfig();
        const wsUrl = await getWebSocketUrlForBackgroundService();
        if (!alive) return;
        connectWebSocket(wsUrl);
      } catch (error) {
        console.error("Failed to initialize WebSocket:", error);
      }
    };

    const connectWebSocket = (wsUrl: string) => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const arr = Array.isArray(raw) ? raw : [raw];

          const updated: Record<number, ServiceData> = {};

          arr.forEach((s: any) => {
            const status: ServiceStatus =
              s.Status === 0 ? ServiceStatus.Idle :
              s.Status === 1 ? ServiceStatus.Running :
              ServiceStatus.Error;

            const cc = Number(s.CountConnectedClients);
            const cs = Number(s.CountSessions);

            updated[s.VpnServerId] = {
              vpnServerId: s.VpnServerId,
              status,
              errorMessage: s.ErrorMessage ?? null,
              nextRunTime: s.NextRunTime ?? "N/A",
              countConnectedClients: Number.isFinite(cc) ? cc : undefined,
              countSessions: Number.isFinite(cs) ? cs : undefined,
            };
          });

          if (!alive) return;
          // Replace snapshot (server sends the full list each tick)
          setServiceData(updated);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        if (!alive) return;
        // simple retry
        reconnectTimerRef.current = setTimeout(() => connectWebSocket(wsUrl), 5000);
      };

      socket.onerror = (e) => {
        console.error("WS error", e);
      };
    };

    initializeWebSocket();

    return () => {
      alive = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      // Close the local socket; don't rely on stale state
      try { socket?.close(); } catch {}
    };
  }, []);

  return { serviceData, runServiceNow };
};

export default useWebSocketService;
