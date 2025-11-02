// hooks/useWebSocketService.ts
import { useState, useEffect, useRef } from "react";
import { postApiOpenVpnServersRunNow } from "../api/orval/open-vpn-servers/open-vpn-servers";
import { fetchConfig, getWebSocketUrlForBackgroundService } from "../api/apirequest";
import type { ServiceStatus } from "../api/orval/model/serviceStatus";

interface ServiceData {
  vpnServerId: number;
  status: ServiceStatus; // 0 | 1 | 2 from orval
  errorMessage: string | null;
  nextRunTime: string;
  countConnectedClients?: number;
  countSessions?: number;
}

// Optional: helper to convert numeric status to label
export const statusLabel = (s: ServiceStatus) =>
  s === 0 ? "idle" : s === 1 ? "running" : "error";

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
            // orval ServiceStatus is 0|1|2; coerce unknowns to 2 ("error")
            const numericStatus = Number(s.Status);
            const status: ServiceStatus =
              (numericStatus === 0 ? 0 : numericStatus === 1 ? 1 : 2) as ServiceStatus;

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
          setServiceData(updated); // or merge if server sends partial updates
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        if (!alive) return;
        reconnectTimerRef.current = setTimeout(() => connectWebSocket(wsUrl), 5000);
      };

      socket.onerror = (e) => {
        console.error("WebSocket error:", e);
      };
    };

    initializeWebSocket();

    return () => {
      alive = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      try {
        socket?.close();
      } catch {}
    };
  }, []);

  // new helper: run background job manually
  const runServiceNow = async () => {
    try {
      const response = await postApiOpenVpnServersRunNow();
      console.info("Manual background service run triggered:", response);
      return response;
    } catch (error) {
      console.error("Failed to trigger RunNow:", error);
      throw error;
    }
  };

  return { serviceData, runServiceNow };
};

export default useWebSocketService;
