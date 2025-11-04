// src/components/ServerList.tsx
import React, { useState, useEffect } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import "../css/ServerList.css";

import useWebSocketService from "../hooks/useWebSocketService";
import ServerItem from "./ServerItem";
import ServiceControls from "./ServiceControls";

// orval-generated imports
import {
  getApiOpenVpnServersGetAllWithStatus,
  deleteApiOpenVpnServersDeleteVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

// Local status type (keep UI-only)
type ServiceStatus = "Running" | "Idle" | "Error" | "Unknown";

import { type ServiceEntry } from "../types/ServiceEntry";

// Minimal backend item shape we actually read
type ApiServerItem = {
  openVpnServerResponses?: { openVpnServer?: any; id?: number } | any;
  openVpnServerStatusLogResponse?: { vpnServerId?: number; upSince?: string };
  status?: ServiceStatus;
  serviceStatus?: ServiceStatus;
  nextRunTime?: string;
  schedulerNextRun?: string;
  errorMessage?: string;
  lastError?: string;
  countConnectedClients?: number;
  connected?: number;
  countSessions?: number;
  sessions?: number;
  id?: number;
  vpnServerId?: number;
  server?: any;
};

// Augmented item we keep in state (UI fields + flattened id)
type ServerWithStatus = {
  openVpnServerResponses: any; // keeps .id valid for legacy UI shape
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  __raw?: ApiServerItem; // keep original raw item for ServerItem
};

// Small helpers to be resilient to different ApiResponse shapes
function unwrap<T>(resp: any): T | undefined {
  return resp?.data ?? resp;
}

function unwrapList<T = any>(resp: any): T[] {
  const data = unwrap<any>(resp);

  // Observed backend shape
  if (Array.isArray(data?.openVpnServerWithStatuses)) return data.openVpnServerWithStatuses;

  // Other common shapes (fallbacks)
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.servers)) return data.servers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.openVpnServerResponses)) return data.openVpnServerResponses;

  // Some backends return { data: { data: [] } }
  if (Array.isArray(resp?.data?.data)) return resp.data.data;

  return [];
}

// Simple debug panel to see raw data on the page (dev only)
const DebugPanel: React.FC<{ label: string; value: any }> = ({ label, value }) => {
  // Vite: use import.meta.env instead of process.env
  if (import.meta.env.PROD) return null;
  return (
    <details style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer" }}>🔎 Debug: {label}</summary>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
};

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRawResponse, setLastRawResponse] = useState<any>(null);
  const [lastUnwrappedList, setLastUnwrappedList] = useState<any>(null);
  const [lastError, setLastError] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const { serviceData, runServiceNow } = useWebSocketService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? parseInt(match[1], 10) : null;

  useEffect(() => {
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge WS snapshot onto current list
  useEffect(() => {
    if (!serviceData || Object.keys(serviceData).length === 0) return;

    type ServiceDataValue = (typeof serviceData)[keyof typeof serviceData];
    const normalized: Record<number, ServiceDataValue> = {};

    for (const [key, value] of Object.entries(serviceData)) {
      const id = Number(key);
      if (!Number.isNaN(id)) normalized[id] = value as ServiceDataValue;
    }

    setServers((prev: ServerWithStatus[]): ServerWithStatus[] =>
      prev.map((server): ServerWithStatus => {
        const id = (server as any).openVpnServerResponses?.id as number;
        const s = normalized[id];
        if (!s) return server;

        return {
          ...server,
          vpnServerId: (s as any).vpnServerId ?? server.vpnServerId,
          serviceStatus: ((s as any).status as ServiceStatus) ?? server.serviceStatus ?? "Idle",
          errorMessage: (s as any).errorMessage ?? server.errorMessage ?? null,
          nextRunTime: (s as any).nextRunTime ?? server.nextRunTime ?? "N/A",
          wsCountConnectedClients: (s as any).countConnectedClients ?? server.wsCountConnectedClients,
          wsCountSessions: (s as any).countSessions ?? server.wsCountSessions,
        };
      })
    );
  }, [serviceData]);

  // Load servers via orval
  const loadServers = async () => {
    setLoading(true);
    setLastError(null);

    try {
      const resp = await getApiOpenVpnServersGetAllWithStatus();

      // Keep raw response for debug panel
      setLastRawResponse(resp);

      const list = unwrapList<ApiServerItem>(resp);
      setLastUnwrappedList(list);

      const mapped: ServerWithStatus[] = list
        .map((x) => {
          const srvWrap: any = x?.openVpnServerResponses;
          const srv: any = srvWrap?.openVpnServer ?? srvWrap ?? x?.server ?? x;

          // Primary id (may be 0 in payload)
          let resolvedId = Number(srv?.id ?? x?.id ?? x?.vpnServerId ?? 0);

          // If zero/missing — fallback to status.vpnServerId
          if (!resolvedId) {
            const statusId = Number(x?.openVpnServerStatusLogResponse?.vpnServerId);
            if (statusId) resolvedId = statusId;
          }
          if (!resolvedId) return null;

          // Flatten to keep existing UI contract: openVpnServerResponses.id must be valid
          const openVpnServerResponses = {
            ...(srv ?? {}),
            ...(srvWrap ?? {}),
            id: resolvedId,
          };

          const status: ServiceStatus =
            (x?.serviceStatus as ServiceStatus) ??
            (x?.status as ServiceStatus) ??
            "Idle";

          const nextRunTime: string =
            (x?.nextRunTime as string) ??
            (x?.schedulerNextRun as string) ??
            "N/A";

          const errorMessage: string | null =
            (x?.errorMessage as string) ??
            (x?.lastError as string) ??
            null;

          const wsCountConnectedClients =
            (x?.countConnectedClients as number) ??
            (x?.connected as number) ??
            undefined;

          const wsCountSessions =
            (x?.countSessions as number) ??
            (x?.sessions as number) ??
            undefined;

          const uiServer: ServerWithStatus = {
            openVpnServerResponses,
            vpnServerId: resolvedId,
            serviceStatus: status,
            errorMessage,
            nextRunTime,
            wsCountConnectedClients,
            wsCountSessions,
            __raw: x,
          };

          return uiServer;
        })
        .filter(Boolean) as ServerWithStatus[];

      setServers(mapped);
    } catch (err) {
      setServers([]);
      setLastError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;
    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      setServers((prev: ServerWithStatus[]): ServerWithStatus[] =>
        prev.filter((s) => ((s as any).openVpnServerResponses?.id as number) !== id)
      );
    } catch {
      // ignore
    }
  };

  // normalize serviceData for ServiceControls (strict typing)
  const normalizedServiceControlsData: Record<string, ServiceEntry> = Object
    .entries(serviceData ?? {})
    .reduce((acc, [k, v]) => {
      const val: any = v ?? {};

      const statusMap: Record<number, ServiceStatus> = { 1: "Running", 0: "Idle", 2: "Error" };
      const status: string =
        typeof val.status === "number"
          ? statusMap[val.status] ?? "Unknown"
          : (val.status ?? "Unknown");

      const nextRunTime: string = typeof val.nextRunTime === "string" ? val.nextRunTime : "N/A";
      const errorMessage: string | null = typeof val.errorMessage === "string" ? val.errorMessage : null;

      const cc = Number(val.countConnectedClients);
      const cs = Number(val.countSessions);

      acc[String(k)] = {
        status,
        nextRunTime,
        errorMessage,
        countConnectedClients: Number.isFinite(cc) ? cc : undefined,
        countSessions: Number.isFinite(cs) ? cs : undefined,
      };

      return acc;
    }, {} as Record<string, ServiceEntry>);


  return (
    <div>
      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn primary" onClick={() => navigate("/servers/add")}>
              <span className="icon">{FaPlus({ className: "icon" })}</span> Add Server
            </button>

            <button className="btn secondary" onClick={loadServers} disabled={loading}>
              <span className={`icon ${loading ? "icon-spin" : ""}`}>
                {FaSyncAlt({ className: `icon ${loading ? "icon-spin" : ""}` })}
              </span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading servers...</p>
        </div>
      ) : (
        <ul className="list">
          {servers.length > 0 ? (
            servers.map((server) => {
              const id = (server as any).openVpnServerResponses?.id as number;
              return (
                <li
                  key={id}
                  className={`server-item clickable ${selectedServerId === id ? "selected" : ""}`}
                  onClick={() => navigate(`/servers/${id}/`)}
                >
                  <ServerItem
                    // pass original raw item; its type is defined in ServerItem.tsx
                    server={(server.__raw as any) ?? server.openVpnServerResponses}
                    vpnServerId={server.vpnServerId}
                    serviceStatus={server.serviceStatus as any}
                    errorMessage={server.errorMessage}
                    nextRunTime={server.nextRunTime}
                    wsCountConnectedClients={server.wsCountConnectedClients}
                    wsCountSessions={server.wsCountSessions}
                    onView={(id) => {
                      if (isMobile) navigate(`/servers/${id}/`);
                      else navigate(`/servers/${id}/`, { replace: true });
                    }}
                    onEdit={(id) => navigate(`/servers/edit/${id}`)}
                    onDelete={handleDelete}
                  />
                </li>
              );
            })
          ) : (
            <p>No servers available.</p>
          )}
        </ul>
      )}

      {/* Debug panels (only show in development) */}
      <DebugPanel label="Last fetch raw response" value={lastRawResponse} />
      <DebugPanel label="Unwrapped list" value={lastUnwrappedList} />
      <DebugPanel label="Mapped servers" value={servers} />
      {lastError && <DebugPanel label="Last error" value={lastError} />}

      <ServiceControls
        serviceData={normalizedServiceControlsData}
        onRunNow={runServiceNow}
      />
    </div>
  );
};

export default ServerList;