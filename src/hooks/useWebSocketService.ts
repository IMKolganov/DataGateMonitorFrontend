// hooks/useWebSocketService.ts
// comments in English only
import { useEffect, useRef, useState } from "react";
import { postApiOpenVpnServersRunNow } from "../api/orval/open-vpn-servers/open-vpn-servers";
import { fetchConfig, getWebSocketUrlForBackgroundService } from "../api/apirequest";
import type { ServiceStatusDto } from "../api/orval/model/serviceStatusDto";

const MIN_ISO = /^0001-01-01T00:00:00/i;

function isValidIso(x?: string): boolean {
  if (!x || MIN_ISO.test(x)) return false;
  const ms = new Date(x).getTime();
  return Number.isFinite(ms);
}

// Accepts: array / record / { key,value } / { ServiceStatus: {...} }
function toDtos(raw: any): ServiceStatusDto[] {
  const arr: any[] = Array.isArray(raw) ? raw : Object.values(raw ?? {});
  const result: ServiceStatusDto[] = [];

  for (const item of arr) {
    const maybePair = item && typeof item === "object" && ("value" in item || "Value" in item);
    const core = maybePair ? (item.value ?? item.Value) : item;
    const leaf = core?.ServiceStatus ?? core?.servicestatus ?? core;

    if (!leaf || typeof leaf !== "object") continue;

    const vpnServerId = Number(leaf.VpnServerId ?? leaf.vpnServerId ?? 0);
    const status = leaf.Status ?? leaf.status;
    const nextRunTime = isValidIso(leaf.NextRunTime ?? leaf.nextRunTime)
      ? String(leaf.NextRunTime ?? leaf.nextRunTime)
      : "N/A";

    const dto: ServiceStatusDto = {
      vpnServerId,
      status,
      errorMessage: leaf.ErrorMessage ?? leaf.errorMessage ?? null,
      nextRunTime,
      countConnectedClients: Number.isFinite(Number(leaf.CountConnectedClients))
        ? Number(leaf.CountConnectedClients)
        : undefined,
      countSessions: Number.isFinite(Number(leaf.CountSessions))
        ? Number(leaf.CountSessions)
        : undefined,
      totalBytesIn: Number.isFinite(Number(leaf.TotalBytesIn)) ? Number(leaf.TotalBytesIn) : undefined,
      totalBytesOut: Number.isFinite(Number(leaf.TotalBytesOut)) ? Number(leaf.TotalBytesOut) : undefined,
    };

    result.push(dto);
  }

  return result;
}

export default function useWebSocketService() {
  const [serviceData, setServiceData] = useState<Record<number, ServiceStatusDto>>({});
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    let socket: WebSocket | null = null;

    const connect = (url: string) => {
      socket = new WebSocket(url);

      socket.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const dtos = toDtos(parsed);
          if (!alive || dtos.length === 0) return;

          const patch: Record<number, ServiceStatusDto> = {};
          for (const d of dtos) {
            const id = d.vpnServerId ?? 0;
            patch[id] = d;
          }
          setServiceData((prev) => ({ ...prev, ...patch }));
        } catch {
          /* ignore */
        }
      };

      socket.onclose = () => {
        if (!alive) return;
        reconnectTimerRef.current = setTimeout(() => connect(url), 5000);
      };

      socket.onerror = () => {
        /* ignore */
      };
    };

    (async () => {
      try {
        await fetchConfig();
        const wsUrl = await getWebSocketUrlForBackgroundService();
        if (!alive) return;
        connect(wsUrl);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      alive = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const runServiceNow = async () => {
    await postApiOpenVpnServersRunNow();
  };

  return { serviceData, runServiceNow };
}
