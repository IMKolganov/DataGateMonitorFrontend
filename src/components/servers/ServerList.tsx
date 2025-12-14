// src/components/ServerList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import "../../css/ServerList.css";

import useSignalRService from "../../hooks/useSignalRService";
import ServerItem from "./ServerItem";
import ServiceControls from "../ServiceControls";

import { getCurrentUser, isAdmin } from "../../utils/auth";

import {
  getApiOpenVpnServersGetAllWithStatus,
  deleteApiOpenVpnServersDeleteVpnServerId,
} from "../../api/orval/open-vpn-servers/open-vpn-servers";

import { ServiceStatus } from "../../api/orval/model";
import type {
  ServiceStatusDto,
  OpenVpnServerWithStatusDto,
  OpenVpnServerWithStatusesResponse,
} from "../../api/orval/model";

type GetAllWithStatusData = Awaited<ReturnType<typeof getApiOpenVpnServersGetAllWithStatus>>;

type OrvalServerItem = OpenVpnServerWithStatusDto;

type MappedServer = {
  id: number;
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  raw: OrvalServerItem;
};

const NUMBER_0 = 0 as ServiceStatus;
const NUMBER_1 = 1 as ServiceStatus;
const NUMBER_2 = 2 as ServiceStatus;

const stringToNumberStatus: Record<string, ServiceStatus> = {
  idle: NUMBER_0,
  running: NUMBER_1,
  error: NUMBER_2,
  "0": NUMBER_0,
  "1": NUMBER_1,
  "2": NUMBER_2,
};

const coerceStatus = (input: unknown): ServiceStatus => {
  if (typeof input === "number") {
    if (input === 0 || input === 1 || input === 2) return input as ServiceStatus;
    return NUMBER_0;
  }
  if (typeof input === "string") {
    const hit = stringToNumberStatus[input.toLowerCase()];
    return hit ?? NUMBER_0;
  }
  return NUMBER_0;
};

const extractList = (resp: GetAllWithStatusData): OrvalServerItem[] => {
  const payload = resp as OpenVpnServerWithStatusesResponse;
  const list = payload.openVpnServerWithStatuses ?? null;
  return Array.isArray(list) ? list : [];
};

const resolveServerId = (item: OrvalServerItem): number => {
  const id =
      item.openVpnServerResponses?.openVpnServer?.id ??
      item.openVpnServerStatusLogResponse?.vpnServerId;

  return typeof id === "number" && Number.isFinite(id) && id !== 0 ? id : 0;
};

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<MappedServer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const user = getCurrentUser();
  const canAddServer = isAdmin(user);

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const { serviceData, runServiceNow } = useSignalRService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  const loadServers = async () => {
    setLoading(true);
    try {
      const resp = await getApiOpenVpnServersGetAllWithStatus();
      const list = extractList(resp);

      const mapped: MappedServer[] = list.flatMap((item) => {
        const id = resolveServerId(item);
        if (!id) return [];

        return [
          {
            id,
            vpnServerId: id,
            serviceStatus: NUMBER_0,
            errorMessage: null,
            nextRunTime: "N/A",
            wsCountConnectedClients: item.countConnectedClients,
            wsCountSessions: item.countSessions,
            raw: item,
          },
        ];
      });

      setServers(mapped);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!serviceData) return;

    const normalized: Record<number, ServiceStatusDto> = {};
    for (const [key, value] of Object.entries(serviceData as Record<string, ServiceStatusDto>)) {
      const id = Number(key);
      if (!Number.isFinite(id)) continue;
      normalized[id] = value;
    }

    setServers((prev) =>
        prev.map((s) => {
          const ws = normalized[s.id];
          if (!ws) return s;

          return {
            ...s,
            serviceStatus: coerceStatus(ws.status),
            errorMessage: ws.errorMessage ?? s.errorMessage ?? null,
            nextRunTime: ws.nextRunTime ?? s.nextRunTime ?? "N/A",
            wsCountConnectedClients: ws.countConnectedClients ?? s.wsCountConnectedClients,
            wsCountSessions: ws.countSessions ?? s.wsCountSessions,
          };
        }),
    );
  }, [serviceData]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;

    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const normalizedServiceControlsData: Record<number, ServiceStatusDto> = useMemo(() => {
    const src = (serviceData ?? {}) as Record<string, ServiceStatusDto>;
    const acc: Record<number, ServiceStatusDto> = {};

    for (const [k, v] of Object.entries(src)) {
      const id = Number(k);
      if (!Number.isFinite(id)) continue;

      acc[id] = {
        status: coerceStatus(v.status),
        nextRunTime: v.nextRunTime,
        errorMessage: v.errorMessage,
        countConnectedClients: v.countConnectedClients,
        countSessions: v.countSessions,
      };
    }

    return acc;
  }, [serviceData]);

  return (
      <div>
        <div className="header-container">
          <div className="header-bar">
            <div className="left-buttons">
              {canAddServer && (
                  <button className="btn primary" onClick={() => navigate("/servers/add")}>
                    <span className="icon">{FaPlus({ className: "icon" })}</span>
                    Add Server
                  </button>
              )}

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
                  servers.map((server) => (
                      <li
                          key={server.id}
                          className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}`}
                          onClick={() =>
                              canAddServer
                                  ? navigate(`/servers/${server.id}/`)
                                  : navigate(`/servers/${server.id}/statistics`)
                          }
                      >
                        <ServerItem
                            server={server.raw}
                            vpnServerId={server.vpnServerId}
                            serviceStatus={server.serviceStatus}
                            errorMessage={server.errorMessage}
                            nextRunTime={server.nextRunTime}
                            wsCountConnectedClients={server.wsCountConnectedClients}
                            wsCountSessions={server.wsCountSessions}
                            onView={(id) => {
                              const target = canAddServer ? `/servers/${id}/` : `/servers/${id}/statistics`;
                              if (isMobile) navigate(target);
                              else navigate(target, { replace: true });
                            }}
                            onEdit={(id) => navigate(`/servers/edit/${id}`)}
                            onDelete={handleDelete}
                        />
                      </li>
                  ))
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
