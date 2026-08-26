// src/components/ServerList.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FaSyncAlt, FaPlus, FaFolderPlus, FaExpand, FaCompress } from "react-icons/fa";
import { useNavigate, useLocation, useMatch } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-toastify";
import "../../css/ServerList.css";

import useSignalRService from "../../hooks/useSignalRService";
import ServerItem from "./ServerItem";
import ServerGroupHeader from "./ServerGroupHeader";
import ServiceControls from "../ServiceControls";

import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";
import {
  buildServerGroupSections,
  loadCollapsedGroups,
  saveCollapsedGroups,
  type CollapsedGroupsMap,
} from "../../utils/serverGroups";

import { deleteApiOpenVpnServersDeleteVpnServerId } from "../../api/orval/vpn-servers/vpn-servers";
import {
  getApiV3OpenVpnServersGetAllWithStatus,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import {
  useGetApiVpnServerGroupsGetAll,
  usePostApiVpnServerGroupsCreate,
  getGetApiVpnServerGroupsGetAllQueryKey,
} from "../../api/orval/vpn-server-groups/vpn-server-groups";
import type { VpnServerGroupsDtoVpnServerGroupDto } from "../../api/orval/model/vpnServerGroupsDtoVpnServerGroupDto";

import { ServiceStatus } from "../../api/orvalModelShim";
import type {
  ServiceStatusDto,
  VpnServerWithStatusV2Dto,
  VpnServerWithStatusesV3Response,
} from "../../api/orvalModelShim";
import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "../../hooks/useCurrentUserConnectedServerIds";

type GetAllWithStatusData = Awaited<ReturnType<typeof getApiV3OpenVpnServersGetAllWithStatus>>;

type OrvalServerItem = VpnServerWithStatusV2Dto;

type MappedServer = {
  id: number;
  vpnServerId: number;
  serviceStatus: ServiceStatus | null;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  wsOnline: boolean | null;
  groupId?: number | null;
  sortOrder?: number;
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
  const payload = resp as VpnServerWithStatusesV3Response;
  const list = payload.vpnServerWithStatuses ?? null;
  return Array.isArray(list) ? list : [];
};

function readGroupsPayload(data: unknown): VpnServerGroupsDtoVpnServerGroupDto[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw.groups)) return raw.groups as VpnServerGroupsDtoVpnServerGroupDto[];
  const nested = raw.data;
  if (nested && typeof nested === "object" && Array.isArray((nested as { groups?: unknown }).groups)) {
    return (nested as { groups: VpnServerGroupsDtoVpnServerGroupDto[] }).groups;
  }
  return [];
}

const resolveServerId = (item: OrvalServerItem): number => {
  const id =
      item.vpnServerResponses?.vpnServer?.id ??
      item.vpnServerStatusLogResponse?.vpnServerId;

  return typeof id === "number" && Number.isFinite(id) && id !== 0 ? id : 0;
};

function serverRowIsDisabled(raw: OrvalServerItem): boolean {
  const v = raw.vpnServerResponses?.vpnServer ?? raw.openVpnServerResponses?.vpnServer;
  return Boolean(v?.isDisabled);
}

const V3_SERVERS_WITH_STATUS_KEY = [
  ...getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
  "mapped-list",
] as const;

function readApiIsOnline(item: OrvalServerItem): boolean {
  const vpn = item.vpnServerResponses?.vpnServer ?? item.openVpnServerResponses?.vpnServer;
  return Boolean(vpn?.isOnline);
}

const ServerList: React.FC = () => {
  const queryClient = useQueryClient();

  const user = getCurrentUser();
  const canAddServer = isAdmin(user);

  const { connectedServerIds } = useCurrentUserConnectedServerIds();

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const groupMatch = useMatch({ path: "/servers/groups/:groupId", end: true });
  const selectedGroupParam = groupMatch?.params.groupId ?? null;

  const { serviceData, runServiceNow, connectionState: hubConnectionState, lastError: hubLastError } =
      useSignalRService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  const [collapsedMap, setCollapsedMap] = useState<CollapsedGroupsMap>(() => loadCollapsedGroups());

  const {
    data: baseServers = [],
    isLoading: loading,
    isFetching: refreshing,
    refetch: loadServers,
  } = useQuery({
    queryKey: V3_SERVERS_WITH_STATUS_KEY,
    queryFn: async () => {
      const resp = await getApiV3OpenVpnServersGetAllWithStatus();
      const list = extractList(resp);

      return list.flatMap((item) => {
        const id = resolveServerId(item);
        if (!id) return [];
        const vpn = item.vpnServerResponses?.vpnServer;

        return [
          {
            id,
            vpnServerId: id,
            serviceStatus: null,
            errorMessage: null,
            nextRunTime: "N/A",
            wsCountConnectedClients: item.countConnectedClients,
            wsCountSessions: item.countSessions,
            wsOnline: readApiIsOnline(item),
            groupId: vpn?.groupId ?? null,
            sortOrder: vpn?.sortOrder ?? 0,
            raw: item,
          },
        ] satisfies MappedServer[];
      });
    },
  });

  // Recover if another screen wrote a different shape under the same query key.
  React.useEffect(() => {
    const poisoned =
      Array.isArray(baseServers) &&
      baseServers.length > 0 &&
      baseServers.some((s) => s == null || typeof s.id !== "number" || s.raw == null);
    if (poisoned) {
      void queryClient.invalidateQueries({ queryKey: V3_SERVERS_WITH_STATUS_KEY });
    }
  }, [baseServers, queryClient]);

  const groupsQuery = useGetApiVpnServerGroupsGetAll();
  const groups = useMemo(() => readGroupsPayload(groupsQuery.data), [groupsQuery.data]);
  const createGroupMutation = usePostApiVpnServerGroupsCreate();

  const servers = useMemo(() => {
    // Guard against a poisoned React Query cache (wrong shape under the same key).
    const safeBase = (baseServers ?? []).filter(
      (s) => s != null && typeof s.id === "number" && s.raw != null && typeof s.raw === "object",
    ) as MappedServer[];

    if (!serviceData) return safeBase;

    const normalized: Record<number, ServiceStatusDto> = {};
    for (const [key, value] of Object.entries(serviceData as Record<string, ServiceStatusDto>)) {
      const id = Number(key);
      if (!Number.isFinite(id) || value == null) continue;
      normalized[id] = value;
    }

    return safeBase.map((s) => {
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
        wsCountConnectedClients:
          ws.countConnectedClients !== undefined ? ws.countConnectedClients : s.wsCountConnectedClients,
        wsCountSessions: ws.countSessions !== undefined ? ws.countSessions : s.wsCountSessions,
        wsOnline: nextWsOnline,
      };
    });
  }, [baseServers, serviceData]);

  const sections = useMemo(
    () => buildServerGroupSections(servers, groups),
    [servers, groups],
  );

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;

    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      queryClient.setQueryData<MappedServer[]>(V3_SERVERS_WITH_STATUS_KEY, (prev) =>
        (prev ?? []).filter((s) => s.id !== id),
      );
    } catch {
      // ignore
    }
  };

  const toggleCollapse = (key: string) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedGroups(next);
      return next;
    });
  };

  const expandAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = false;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const collapseAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = true;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const addGroup = async () => {
    const name = window.prompt("New group name");
    if (!name?.trim()) return;
    try {
      const created = await createGroupMutation.mutateAsync({ data: { name: name.trim() } });
      const payload = created as Record<string, unknown> | undefined;
      const group =
        (payload?.group as { id?: number } | undefined) ??
        ((payload?.data as { group?: { id?: number } } | undefined)?.group);
      const id = group?.id;
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
      toast.success("Group created");
      if (typeof id === "number") navigate(`/servers/groups/${id}`);
    } catch {
      toast.error("Failed to create group");
    }
  };

  const handleRefresh = () => {
    void Promise.all([loadServers(), groupsQuery.refetch()]);
  };

  const normalizedServiceControlsData: Record<number, ServiceStatusDto> = useMemo(() => {
    const hub = (serviceData ?? {}) as Record<number, ServiceStatusDto>;
    const acc: Record<number, ServiceStatusDto> = {};

    for (const s of servers) {
      const id = s.id;
      const ws = pickServiceDataEntry(hub, id);

      const base: ServiceStatusDto = {
        vpnServerId: id,
        countConnectedClients: s.wsCountConnectedClients ?? s.raw?.countConnectedClients,
        countSessions: s.wsCountSessions ?? s.raw?.countSessions,
        totalBytesIn: s.raw?.totalBytesIn,
        totalBytesOut: s.raw?.totalBytesOut,
      };

      if (serverRowIsDisabled(s.raw)) {
        acc[id] = {
          ...base,
          ...(ws ?? {}),
          status: NUMBER_0,
          nextRunTime: "N/A",
          errorMessage: null,
          countConnectedClients: ws?.countConnectedClients ?? base.countConnectedClients,
          countSessions: ws?.countSessions ?? base.countSessions,
        };
      } else if (ws) {
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

  const renderServer = (server: MappedServer) => (
    <li
      key={server.id}
      className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}${
        serverRowIsDisabled(server.raw) ? " server-item--polling-off" : ""
      }`}
      onClick={() =>
        navigate(buildServerSwitchPath(server.id, location.pathname, canAddServer))
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
        isCurrentUserConnected={isUserConnectedToServer(connectedServerIds, server.id)}
        onView={(id) => {
          const target = buildServerSwitchPath(id, location.pathname, canAddServer);
          if (isMobile) navigate(target);
          else navigate(target, { replace: true });
        }}
        onEdit={(id) => navigate(`/servers/edit/${id}`)}
        onDelete={handleDelete}
      />
    </li>
  );

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

              {canAddServer && (
                  <button className="btn secondary" onClick={() => void addGroup()}>
                    <span className="icon">{FaFolderPlus({ className: "icon" })}</span>
                    Add Group
                  </button>
              )}

              <button
                className="btn secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-busy={refreshing}
              >
              <span className={`icon ${refreshing ? "icon-spin" : ""}`}>
                {FaSyncAlt({ className: `icon ${refreshing ? "icon-spin" : ""}` })}
              </span>
                Refresh
              </button>
            </div>

            {!loading && (servers.length > 0 || sections.length > 0) && (
              <div className="header-bar__meta">
                <span className="server-list-count">
                  {servers.length} {servers.length === 1 ? "server" : "servers"}
                </span>
                {sections.length > 0 && (
                  <div className="server-groups-toolbar" role="group" aria-label="Group expand controls">
                    <button
                      type="button"
                      className="server-groups-toolbar__btn"
                      onClick={expandAllGroups}
                      title="Expand all"
                      aria-label="Expand all groups"
                    >
                      {FaExpand({ className: "icon" })}
                    </button>
                    <button
                      type="button"
                      className="server-groups-toolbar__btn"
                      onClick={collapseAllGroups}
                      title="Collapse all"
                      aria-label="Collapse all groups"
                    >
                      {FaCompress({ className: "icon" })}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
            <ul className="list">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="server-item server-item-skeleton">
                  <div className="server-item-content">
                    <div className="server-header">
                      <div className="server-info">
                        <span className="skeleton skeleton--w220-h20" />
                      </div>
                      <span className="skeleton skeleton--w70-h22" />
                    </div>
                    <div className="server-details">
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w140-h14" />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w180-h14" />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w100-h14" />
                      </div>
                    </div>
                    <div className="server-tags-block">
                      <span className="skeleton skeleton--w60-h14" />
                      <span className="skeleton skeleton--w80-h24" />
                      <span className="skeleton skeleton--w50-h24" />
                    </div>
                    <div className="server-actions">
                      <div className="server-actions-buttons">
                        <span className="skeleton skeleton--w70-h32" />
                        <span className="skeleton skeleton--w65-h32" />
                        <span className="skeleton skeleton--w75-h32" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
        ) : (
            <div className="server-groups">
              {servers.length > 0 || groups.length > 0 ? (
                  sections.map((section) => {
                    const key = String(section.key);
                    const collapsed = Boolean(collapsedMap[key]);
                    const selected = selectedGroupParam === key;
                    return (
                      <div key={key} className="server-group">
                        <ServerGroupHeader
                          name={section.name}
                          count={section.servers.length}
                          collapsed={collapsed}
                          selected={selected}
                          onToggleCollapse={() => toggleCollapse(key)}
                          onOpen={() => navigate(`/servers/groups/${key}`)}
                        />
                        {!collapsed && (
                          <ul className="list server-group-list">
                            {section.servers.length > 0
                              ? section.servers.map(renderServer)
                              : (
                                <li className="server-group-empty">No servers in this group.</li>
                              )}
                          </ul>
                        )}
                      </div>
                    );
                  })
              ) : (
                  <p>No servers available.</p>
              )}
            </div>
        )}

        <ServiceControls
            serviceData={normalizedServiceControlsData}
            onRunNow={runServiceNow}
            onOpenDetails={() => navigate("/servers/status-stream-logs")}
            hubConnectionState={hubConnectionState}
            hubLastError={hubLastError}
        />
      </div>
  );
};

export default ServerList;
