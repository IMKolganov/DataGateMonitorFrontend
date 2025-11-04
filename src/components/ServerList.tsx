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

import { type ServiceEntry } from "../types/ServiceEntry";

type ServiceStatus = "Running" | "Idle" | "Error" | "Unknown";

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

type ServerWithStatus = {
  openVpnServerResponses: any;
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  __raw?: ApiServerItem;
};

function unwrap<T>(resp: any): T | undefined {
  return resp?.data ?? resp;
}

function unwrapList<T = any>(resp: any): T[] {
  const data = unwrap<any>(resp);
  if (Array.isArray(data?.openVpnServerWithStatuses)) return data.openVpnServerWithStatuses;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.servers)) return data.servers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.openVpnServerResponses)) return data.openVpnServerResponses;
  if (Array.isArray(resp?.data?.data)) return resp.data.data;
  return [];
}

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const loadServers = async () => {
    setLoading(true);
    try {
      const resp = await getApiOpenVpnServersGetAllWithStatus();
      const list = unwrapList<ApiServerItem>(resp);

      const mapped: ServerWithStatus[] = list
        .map((x) => {
          const srvWrap: any = x?.openVpnServerResponses;
          const srv: any = srvWrap?.openVpnServer ?? srvWrap ?? x?.server ?? x;

          let resolvedId = Number(srv?.id ?? x?.id ?? x?.vpnServerId ?? 0);
          if (!resolvedId) {
            const statusId = Number(x?.openVpnServerStatusLogResponse?.vpnServerId);
            if (statusId) resolvedId = statusId;
          }
          if (!resolvedId) return null;

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

          return {
            openVpnServerResponses,
            vpnServerId: resolvedId,
            serviceStatus: status,
            errorMessage,
            nextRunTime,
            wsCountConnectedClients,
            wsCountSessions,
            __raw: x,
          };
        })
        .filter(Boolean) as ServerWithStatus[];

      setServers(mapped);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;
    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      setServers((prev) => prev.filter((s) => ((s as any).openVpnServerResponses?.id as number) !== id));
    } catch {
      // ignore
    }
  };

  const normalizedServiceControlsData: Record<string, ServiceEntry> = Object.entries(serviceData ?? {}).reduce(
    (acc, [k, v]) => {
      const val: any = v ?? {};
      const statusMap: Record<number, ServiceStatus> = { 1: "Running", 0: "Idle", 2: "Error" };
      const status: string =
        typeof val.status === "number" ? statusMap[val.status] ?? "Unknown" : (val.status ?? "Unknown");

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
    },
    {} as Record<string, ServiceEntry>
  );

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

      <ServiceControls serviceData={normalizedServiceControlsData} onRunNow={runServiceNow} />
    </div>
  );
};

export default ServerList;
