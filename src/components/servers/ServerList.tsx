// src/components/ServerList.tsx
import React, { useState, useEffect } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import "../../css/ServerList.css";

import useWebSocketService from "../../hooks/useWebSocketService.ts";
import ServerItem from "./ServerItem.tsx";
import ServiceControls from "../ServiceControls.tsx";

// orval-generated imports
import {
  getApiOpenVpnServersGetAllWithStatus,
  deleteApiOpenVpnServersDeleteVpnServerId,
} from "../../api/orval/open-vpn-servers/open-vpn-servers.ts";

import { ServiceStatus } from "../../api/orval/model";
import type { ServiceStatusDto } from "../../api/orval/model";

type ApiServerItem = {
  openVpnServerResponses?: { openVpnServer?: any; id?: number } | any;
  openVpnServerStatusLogResponse?: { vpnServerId?: number; upSince?: string };
  status?: ServiceStatus | number | string;
  serviceStatus?: ServiceStatus | number | string;
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

// Orval-generated numeric enum values
const { NUMBER_0, NUMBER_1, NUMBER_2 } = (ServiceStatus as unknown) as {
  NUMBER_0: ServiceStatus;
  NUMBER_1: ServiceStatus;
  NUMBER_2: ServiceStatus;
};

// Domain mapping (adjust if backend uses different meanings):
// 0 = Idle, 1 = Running, 2 = Error
const stringToNumberStatus: Record<string, ServiceStatus> = {
  idle: NUMBER_0,
  running: NUMBER_1,
  error: NUMBER_2,
  // tolerate alternative casings
  "0": NUMBER_0,
  "1": NUMBER_1,
  "2": NUMBER_2,
};

// Coerce any input into ServiceStatus (0|1|2). Fallback to 0 (Idle).
const coerceStatus = (input: unknown): ServiceStatus => {
  if (typeof input === "number") {
    if (input === NUMBER_0 || input === NUMBER_1 || input === NUMBER_2) return input as ServiceStatus;
    // unknown number -> default
    return NUMBER_0;
  }
  if (typeof input === "string") {
    const hit = stringToNumberStatus[input.toLowerCase()];
    return hit ?? NUMBER_0;
  }
  // already typed or undefined -> default
  return (input as ServiceStatus) ?? NUMBER_0;
};

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
          serviceStatus: coerceStatus((s as any).status ?? server.serviceStatus),
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
            coerceStatus(x?.serviceStatus) ??
            coerceStatus(x?.status);

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

  // Build exactly Record<number, ServiceStatusDto> for ServiceControls
  const normalizedServiceControlsData: Record<number, ServiceStatusDto> =
    Object.entries(serviceData ?? {}).reduce((acc, [k, v]) => {
      const id = Number(k);
      if (!Number.isFinite(id)) return acc;

      const val: any = v ?? {};

      const status: ServiceStatus = coerceStatus(val.status);

      const nextRunTime =
        typeof val.nextRunTime === "string" && val.nextRunTime.length > 0
          ? val.nextRunTime
          : undefined;

      const errorMessage =
        typeof val.errorMessage === "string" && val.errorMessage.length > 0
          ? val.errorMessage
          : undefined;

      const cc = Number(val.countConnectedClients);
      const cs = Number(val.countSessions);

      acc[id] = {
        status,
        nextRunTime,
        errorMessage,
        countConnectedClients: Number.isFinite(cc) ? cc : undefined,
        countSessions: Number.isFinite(cs) ? cs : undefined,
      };

      return acc;
    }, {} as Record<number, ServiceStatusDto>);

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
                    // Keep as any if ServerItem expects other shape
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
