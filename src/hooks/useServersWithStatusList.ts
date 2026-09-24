import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import useSignalRService from "./useSignalRService";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import {
  buildServerGroupSections,
  loadShowDeletedServers,
  saveShowDeletedServers,
  readGroupsPayload,
  DELETED_GROUP_ID,
  type ServerGroupSection,
} from "../utils/serverGroups";
import {
  isVpnServerDeleted,
  serverMatchesSearchQuery,
} from "../utils/serverListSearch";
import { deleteApiOpenVpnServersDeleteVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import {
  getApiV3OpenVpnServersGetAllWithStatus,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import { useGetApiVpnServerGroupsGetAll } from "../api/orval/vpn-server-groups/vpn-server-groups";
import { ServiceStatus } from "../api/orvalModelShim";
import type {
  ServiceStatusDto,
  VpnServerWithStatusV2Dto,
  VpnServerWithStatusesV3Response,
} from "../api/orvalModelShim";
import type { VpnServerGroupsDtoVpnServerGroupDto } from "../api/orval/model/vpnServerGroupsDtoVpnServerGroupDto";

type GetAllWithStatusData = Awaited<ReturnType<typeof getApiV3OpenVpnServersGetAllWithStatus>>;

export type OrvalServerItem = VpnServerWithStatusV2Dto;

export type MappedServer = {
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

export const coerceServiceStatus = (input: unknown): ServiceStatus => {
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

export function wsStatusIsPresent(
  ws: ServiceStatusDto | undefined,
): ws is ServiceStatusDto & { status: ServiceStatus } {
  return ws != null && ws.status !== undefined && ws.status !== null;
}

export function pickServiceDataEntry(
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

export const resolveServerId = (item: OrvalServerItem): number => {
  const id =
    item.vpnServerResponses?.vpnServer?.id ?? item.vpnServerStatusLogResponse?.vpnServerId;

  return typeof id === "number" && Number.isFinite(id) && id !== 0 ? id : 0;
};

export function serverRowIsDisabled(raw: OrvalServerItem): boolean {
  const v = raw.vpnServerResponses?.vpnServer ?? raw.openVpnServerResponses?.vpnServer;
  return Boolean(v?.isDisabled);
}

function v3ServersWithStatusListKey(includeDeleted: boolean) {
  return [
    ...getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(
      includeDeleted ? { includeDeleted: true } : undefined,
    ),
    "mapped-list",
  ] as const;
}

function readApiIsOnline(item: OrvalServerItem): boolean {
  const vpn = item.vpnServerResponses?.vpnServer ?? item.openVpnServerResponses?.vpnServer;
  return Boolean(vpn?.isOnline);
}

export type UseServersWithStatusListResult = {
  canManage: boolean;
  fetchIncludeDeleted: boolean;
  serversListKey: ReturnType<typeof v3ServersWithStatusListKey>;
  servers: MappedServer[];
  /** Flat list after search + deleted visibility rules (for grid). */
  visibleServers: MappedServer[];
  /** Grouped sections after search + deleted rules (for Groups tab / sidebar). */
  sections: ServerGroupSection<MappedServer>[];
  visibleServerCount: number;
  groups: VpnServerGroupsDtoVpnServerGroupDto[];
  groupsQuery: ReturnType<typeof useGetApiVpnServerGroupsGetAll>;
  loading: boolean;
  refreshing: boolean;
  loadServers: () => Promise<unknown>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showDeleted: boolean;
  toggleShowDeleted: () => void;
  handleDelete: (id: number) => Promise<void>;
  handleRefresh: () => void;
  invalidateServers: () => Promise<void>;
  serviceData: ReturnType<typeof useSignalRService>["serviceData"];
  runServiceNow: ReturnType<typeof useSignalRService>["runServiceNow"];
  hubConnectionState: ReturnType<typeof useSignalRService>["connectionState"];
  hubLastError: ReturnType<typeof useSignalRService>["lastError"];
  normalizedServiceControlsData: Record<number, ServiceStatusDto>;
  queryClient: ReturnType<typeof useQueryClient>;
};

export function useServersWithStatusList(): UseServersWithStatusListResult {
  const queryClient = useQueryClient();
  const canManage = isAdmin(getCurrentUser());
  const fetchIncludeDeleted = canManage;
  const serversListKey = v3ServersWithStatusListKey(fetchIncludeDeleted);

  const { serviceData, runServiceNow, connectionState: hubConnectionState, lastError: hubLastError } =
    useSignalRService();

  const [showDeleted, setShowDeleted] = useState(() => loadShowDeletedServers());
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: baseServers = [],
    isLoading: loading,
    isFetching: refreshing,
    refetch: loadServers,
  } = useQuery({
    queryKey: serversListKey,
    queryFn: async () => {
      const resp = await getApiV3OpenVpnServersGetAllWithStatus(
        fetchIncludeDeleted ? { includeDeleted: true } : undefined,
      );
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

  React.useEffect(() => {
    const poisoned =
      Array.isArray(baseServers) &&
      baseServers.length > 0 &&
      baseServers.some((s) => s == null || typeof s.id !== "number" || s.raw == null);
    if (poisoned) {
      void queryClient.invalidateQueries({ queryKey: serversListKey });
    }
  }, [baseServers, queryClient, serversListKey]);

  const groupsQuery = useGetApiVpnServerGroupsGetAll();
  const groups = useMemo(() => readGroupsPayload(groupsQuery.data), [groupsQuery.data]);

  const servers = useMemo(() => {
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
        serviceStatus: wsStatusIsPresent(ws) ? coerceServiceStatus(ws.status) : s.serviceStatus,
        errorMessage: ws.errorMessage !== undefined ? ws.errorMessage : s.errorMessage,
        nextRunTime:
          ws.nextRunTime !== undefined && ws.nextRunTime !== "" ? ws.nextRunTime : s.nextRunTime,
        wsCountConnectedClients:
          ws.countConnectedClients !== undefined
            ? ws.countConnectedClients
            : s.wsCountConnectedClients,
        wsCountSessions: ws.countSessions !== undefined ? ws.countSessions : s.wsCountSessions,
        wsOnline: nextWsOnline,
      };
    });
  }, [baseServers, serviceData]);

  const matchedServers = useMemo(
    () => servers.filter((s) => serverMatchesSearchQuery(s.raw, searchQuery)),
    [servers, searchQuery],
  );

  const searching = searchQuery.trim().length > 0;

  const visibleServers = useMemo(() => {
    const active = matchedServers.filter((s) => !isVpnServerDeleted(s.raw));
    const deleted = fetchIncludeDeleted
      ? matchedServers.filter(
          (s) => isVpnServerDeleted(s.raw) && (showDeleted || searching),
        )
      : [];
    return [...active, ...deleted.sort((a, b) => a.id - b.id)];
  }, [matchedServers, fetchIncludeDeleted, showDeleted, searching]);

  const sections = useMemo((): ServerGroupSection<MappedServer>[] => {
    const active = matchedServers.filter((s) => !isVpnServerDeleted(s.raw));
    const deleted = fetchIncludeDeleted
      ? matchedServers.filter(
          (s) => isVpnServerDeleted(s.raw) && (showDeleted || searching),
        )
      : [];
    let base = buildServerGroupSections(active, groups);
    if (searching) {
      base = base.filter((s) => s.servers.length > 0);
    }
    if (deleted.length === 0) return base;
    return [
      ...base,
      {
        key: DELETED_GROUP_ID,
        name: "Deleted",
        sortOrder: Number.MAX_SAFE_INTEGER,
        servers: deleted.sort((a, b) => a.id - b.id),
      },
    ];
  }, [matchedServers, groups, searching, fetchIncludeDeleted, showDeleted]);

  const visibleServerCount = useMemo(
    () => sections.reduce((n, s) => n + s.servers.length, 0),
    [sections],
  );

  const toggleShowDeleted = () => {
    setShowDeleted((prev) => {
      const next = !prev;
      saveShowDeletedServers(next);
      return next;
    });
  };

  const invalidateServers = async () => {
    await queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(),
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;

    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      queryClient.setQueryData<MappedServer[]>(serversListKey, (prev) => {
        const list = prev ?? [];
        if (!fetchIncludeDeleted) return list.filter((s) => s.id !== id);
        return list.map((s) => {
          if (s.id !== id) return s;
          const vpn = s.raw.vpnServerResponses?.vpnServer;
          if (!vpn) return s;
          return {
            ...s,
            raw: {
              ...s.raw,
              vpnServerResponses: {
                ...s.raw.vpnServerResponses,
                vpnServer: { ...vpn, isDeleted: true },
              },
            },
          };
        });
      });
    } catch {
      // ignore
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
          status: wsStatusIsPresent(ws) ? coerceServiceStatus(ws.status) : undefined,
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

  return {
    canManage,
    fetchIncludeDeleted,
    serversListKey,
    servers,
    visibleServers,
    sections,
    visibleServerCount,
    groups,
    groupsQuery,
    loading,
    refreshing,
    loadServers,
    searchQuery,
    setSearchQuery,
    showDeleted,
    toggleShowDeleted,
    handleDelete,
    handleRefresh,
    invalidateServers,
    serviceData,
    runServiceNow,
    hubConnectionState,
    hubLastError,
    normalizedServiceControlsData,
    queryClient,
  };
}
