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

// Infer list item type directly from orval response
type GetAllWithStatusResp = Awaited<ReturnType<typeof getApiOpenVpnServersGetAllWithStatus>>;
type OrvalServerItem =
  GetAllWithStatusResp extends { data: infer D }
    ? D extends { openVpnServerWithStatuses: infer A }
      ? A extends Array<infer T>
        ? T
        : never
      : never
    : never;

// Local status type (no utils dependency)
type ServiceStatus = "Running" | "Idle" | "Error" | "Unknown";

// Augmented item we keep in state (add UI-only fields)
type ServerWithStatus = OrvalServerItem & {
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
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
  if (process.env.NODE_ENV === "production") return null;
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

    setServers((prev) =>
      prev.map((server) => {
        const id = (server as any).openVpnServerResponses?.id as number;
        const s = normalized[id];
        if (!s) return server;

        return {
          ...server,
          vpnServerId: (s as any).vpnServerId,
          serviceStatus: ((s as any).status as ServiceStatus) ?? "Idle",
          errorMessage: (s as any).errorMessage ?? null,
          nextRunTime: (s as any).nextRunTime ?? "N/A",
          wsCountConnectedClients: (s as any).countConnectedClients,
          wsCountSessions: (s as any).countSessions,
        };
      }),
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

      const list = unwrapList<OrvalServerItem>(resp);
      setLastUnwrappedList(list);

      const mapped: ServerWithStatus[] = list
        .map((x: OrvalServerItem) => {
          const srvWrap: any = (x as any)?.openVpnServerResponses;
          const srv: any = srvWrap?.openVpnServer ?? srvWrap ?? (x as any)?.server ?? x;

          // Primary id (may be 0 in payload)
          let resolvedId = Number(srv?.id ?? (x as any)?.id ?? (x as any)?.vpnServerId ?? 0);

          // If zero/missing — fallback to status.vpnServerId
          if (!resolvedId) {
            const statusId = Number((x as any)?.openVpnServerStatusLogResponse?.vpnServerId);
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
            (((x as any)?.serviceStatus as ServiceStatus) ??
              ((x as any)?.status as ServiceStatus) ??
              "Idle");

          const nextRunTime: string =
            ((x as any)?.nextRunTime as string) ??
            ((x as any)?.schedulerNextRun as string) ??
            "N/A";

          const errorMessage: string | null =
            ((x as any)?.errorMessage as string) ??
            ((x as any)?.lastError as string) ??
            null;

          const wsCountConnectedClients =
            ((x as any)?.countConnectedClients as number) ??
            ((x as any)?.connected as number) ??
            undefined;

          const wsCountSessions =
            ((x as any)?.countSessions as number) ??
            ((x as any)?.sessions as number) ??
            undefined;

          const uiServer: ServerWithStatus = {
            ...(x as any),
            openVpnServerResponses,
            vpnServerId: resolvedId,
            serviceStatus: status,
            errorMessage,
            nextRunTime,
            wsCountConnectedClients,
            wsCountSessions,
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
      setServers((prev) => prev.filter((s) => (s as any).openVpnServerResponses?.id !== id));
    } catch {
      // ignore
    }
  };

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
                    server={server as any}
                    vpnServerId={server.vpnServerId}
                    serviceStatus={server.serviceStatus}
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

      <ServiceControls serviceData={serviceData} onRunNow={runServiceNow} />
    </div>
  );
};

export default ServerList;
