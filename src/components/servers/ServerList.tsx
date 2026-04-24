// src/components/ServerList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import "../../css/ServerList.css";

import useSignalRService from "../../hooks/useSignalRService";
import ServerItem from "./ServerItem";
import ServiceControls from "../ServiceControls";

import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";

import { deleteApiOpenVpnServersDeleteVpnServerId } from "../../api/orval/vpn-servers/vpn-servers";
import { getApiV2OpenVpnServersGetAllWithStatus } from "../../api/orval/vpn-servers-v2/vpn-servers-v2";

import { ServiceStatus } from "../../api/orvalModelShim";
import type {
  ServiceStatusDto,
  VpnServerWithStatusV2Dto,
  VpnServerWithStatusesV2Response,
} from "../../api/orvalModelShim";

type GetAllWithStatusData = Awaited<ReturnType<typeof getApiV2OpenVpnServersGetAllWithStatus>>;

type OrvalServerItem = VpnServerWithStatusV2Dto;

type MappedServer = {
  id: number;
  vpnServerId: number;
  /** Background service status; null until the status-stream hub sends a snapshot for this server. */
  serviceStatus: ServiceStatus | null;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  /** When hub sends IsOnline, overrides REST badge for real-time offline/online. */
  wsOnline: boolean | null;
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

function wsStatusIsPresent(ws: ServiceStatusDto | undefined): ws is ServiceStatusDto & { status: ServiceStatus } {
  return ws != null && ws.status !== undefined && ws.status !== null;
}

function pickServiceDataEntry(
  map: Record<number, ServiceStatusDto>,
  id: number,
): ServiceStatusDto | undefined {
  return map[id] ?? (map as unknown as Record<string, ServiceStatusDto>)[String(id)];
}

const extractList = (resp: GetAllWithStatusData): OrvalServerItem[] => {
  const payload = resp as VpnServerWithStatusesV2Response;
  const list = payload.vpnServerWithStatuses ?? null;
  return Array.isArray(list) ? list : [];
};

const resolveServerId = (item: OrvalServerItem): number => {
  const id =
      item.vpnServerResponses?.vpnServer?.id ??
      item.vpnServerStatusLogResponse?.vpnServerId;

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

  const { serviceData, runServiceNow, connectionState: hubConnectionState, lastError: hubLastError } =
      useSignalRService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  const loadServers = async () => {
    setLoading(true);
    try {
      const resp = await getApiV2OpenVpnServersGetAllWithStatus();
      const list = extractList(resp);

      const mapped: MappedServer[] = list.flatMap((item) => {
        const id = resolveServerId(item);
        if (!id) return [];

        return [
          {
            id,
            vpnServerId: id,
            serviceStatus: null,
            errorMessage: null,
            nextRunTime: "N/A",
            // Snapshot from GET (DB); live values overwritten when the hub sends CountConnectedClients / CountSessions.
            wsCountConnectedClients: item.countConnectedClients,
            wsCountSessions: item.countSessions,
            wsOnline: null,
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
          const ws = pickServiceDataEntry(normalized, s.id);
          if (!ws) return s;

          const onlineRaw = (ws as ServiceStatusDto & { isOnline?: boolean }).isOnline;
          const nextWsOnline = typeof onlineRaw === "boolean" ? onlineRaw : s.wsOnline;

          return {
            ...s,
            serviceStatus: wsStatusIsPresent(ws) ? coerceStatus(ws.status) : s.serviceStatus,
            errorMessage: ws.errorMessage !== undefined ? ws.errorMessage : s.errorMessage,
            nextRunTime:
              ws.nextRunTime !== undefined && ws.nextRunTime !== "" ? ws.nextRunTime : s.nextRunTime,
            // Prefer hub numbers when present (real-time); keep last REST/WS value if the payload omits counts.
            wsCountConnectedClients:
              ws.countConnectedClients !== undefined ? ws.countConnectedClients : s.wsCountConnectedClients,
            wsCountSessions: ws.countSessions !== undefined ? ws.countSessions : s.wsCountSessions,
            wsOnline: nextWsOnline,
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

  /** Footer aggregates: REST baseline per server, then live WebSocket overlay (real-time status / next run / counts). */
  const normalizedServiceControlsData: Record<number, ServiceStatusDto> = useMemo(() => {
    const hub = (serviceData ?? {}) as Record<number, ServiceStatusDto>;
    const acc: Record<number, ServiceStatusDto> = {};

    for (const s of servers) {
      const id = s.id;
      const ws = pickServiceDataEntry(hub, id);

      const base: ServiceStatusDto = {
        vpnServerId: id,
        countConnectedClients: s.wsCountConnectedClients ?? s.raw.countConnectedClients,
        countSessions: s.wsCountSessions ?? s.raw.countSessions,
        totalBytesIn: s.raw.totalBytesIn,
        totalBytesOut: s.raw.totalBytesOut,
      };

      if (ws) {
        acc[id] = {
          ...base,
          ...ws,
          status: wsStatusIsPresent(ws) ? coerceStatus(ws.status) : undefined,
          nextRunTime: ws.nextRunTime,
          errorMessage: ws.errorMessage ?? null,
          countConnectedClients: ws.countConnectedClients ?? base.countConnectedClients,
          countSessions: ws.countSessions ?? base.countSessions,
        };
      } else {
        acc[id] = base;
      }
    }

    return acc;
  }, [servers, serviceData]);

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
            <ul className="list">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="server-item server-item-skeleton">
                  <div className="server-item-content">
                    <div className="server-header">
                      <div className="server-info">
                        <span className="skeleton" style={{ width: 220, height: 20 }} />
                      </div>
                      <span className="skeleton" style={{ width: 70, height: 22 }} />
                    </div>
                    <div className="server-details">
                      <div className="detail-row">
                        <span className="skeleton" style={{ width: 14, height: 14 }} />
                        <span className="skeleton" style={{ width: 140, height: 14 }} />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton" style={{ width: 14, height: 14 }} />
                        <span className="skeleton" style={{ width: 180, height: 14 }} />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton" style={{ width: 14, height: 14 }} />
                        <span className="skeleton" style={{ width: 100, height: 14 }} />
                      </div>
                    </div>
                    <div className="server-tags-block">
                      <span className="skeleton" style={{ width: 60, height: 14 }} />
                      <span className="skeleton" style={{ width: 80, height: 24, borderRadius: 6 }} />
                      <span className="skeleton" style={{ width: 50, height: 24, borderRadius: 6 }} />
                    </div>
                    <div className="server-actions">
                      <div className="server-actions-buttons">
                        <span className="skeleton" style={{ width: 70, height: 32, borderRadius: 6 }} />
                        <span className="skeleton" style={{ width: 65, height: 32, borderRadius: 6 }} />
                        <span className="skeleton" style={{ width: 75, height: 32, borderRadius: 6 }} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
        ) : (
            <ul className="list">
              {servers.length > 0 ? (
                  servers.map((server) => (
                      <li
                          key={server.id}
                          className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}`}
                          onClick={() =>
                              navigate(
                                  buildServerSwitchPath(server.id, location.pathname, canAddServer),
                              )
                          }
                      >
                        <ServerItem
                            server={server.raw}
                            vpnServerId={server.vpnServerId}
                            serviceStatus={server.serviceStatus}
                            errorMessage={server.errorMessage}
                            nextRunTime={server.nextRunTime}
                            wsOnline={server.wsOnline}
                            wsCountConnectedClients={server.wsCountConnectedClients}
                            wsCountSessions={server.wsCountSessions}
                            onView={(id) => {
                              const target = buildServerSwitchPath(id, location.pathname, canAddServer);
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

        <ServiceControls
            serviceData={normalizedServiceControlsData}
            onRunNow={runServiceNow}
            hubConnectionState={hubConnectionState}
            hubLastError={hubLastError}
        />
      </div>
  );
};

export default ServerList;
