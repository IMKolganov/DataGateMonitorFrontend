// src/pages/servers/ServersOverview.tsx
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaChartLine } from "react-icons/fa";

import { errorMessage } from "../../utils/errorMessage";
import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import StatsCards from "./StatsCards";
import OverviewChart from "./OverviewChart";
import GeoMap from "./GeoMap";
import { StatisticsScopeBanner } from "./StatisticsScopeBanner";
import { OverviewUserProfileCard } from "./OverviewUserProfileCard";
import "../../css/Settings.css";
import { addDays, endOfToday, startOfToday, toChartPoints, toUsersSeriesChartPoints, mergeChartWithUsersSeries, buildFallbackOverviewResponse, normalizeGrouping } from "./helpers";
import type { ChartPoint, MergedChartPoint } from "./types";

import { keepPreviousData, useQueries } from "@tanstack/react-query";

// orval hooks & types
import {
  getApiOpenVpnClientsGetAllConnected,
  useGetApiOpenVpnClientsGetAllConnected,
  useGetApiOpenVpnClientsOverviewPoints,
  useGetApiOpenVpnClientsOverviewSeries,
  useGetApiOpenVpnClientsOverviewSummary,
  useGetApiOpenVpnClientsOverviewUsers,
  useGetApiOpenVpnClientsOverviewUsersSeries,
} from "../../api/orval/vpn-server-clients/vpn-server-clients";
import { useGetApiOpenVpnServersGetVpnServerId } from "../../api/orval/vpn-servers/vpn-servers";
import {
  useGetApiV3OpenVpnServersGetAll,
  useGetApiV3OpenVpnServersGetAllWithStatus,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type {
  GetAllUsersResponse,
  OverviewSeriesResponse,
  OverviewTotalsResponse,
  OverviewUserDto,
  OverviewUsersResponse,
  OverviewUsersSeriesResponse,
  VpnServerClientsDtoGeoPointAggDto,
  VpnClientInfoDto,
  VpnServerClientsResponsesConnectedClientsResponse,
  VpnServerV2Dto,
  VpnServerResponse,
  VpnServersDtoVpnServerWithStatusV2Dto,
  VpnServersV3Response,
  GetApiOpenVpnClientsOverviewSeriesParams,
  GetApiOpenVpnClientsOverviewSummaryParams,
} from "../../api/orvalModelShim";
import { OverviewGrouping } from "../../api/orvalModelShim";

const OverviewUsersTable = lazy(() =>
  import("../../components/OverviewUsersTable").then((m) => ({ default: m.OverviewUsersTable })),
);
const VpnMap = lazy(() => import("../../components/VpnMap"));
import { useProxyTrafficFlowMany, type ProxyTrafficFlowUpdate } from "../../hooks/useProxyTrafficFlow";
import { canViewUserStatisticsScope } from "../../utils/auth/canViewUserStatisticsScope";
import { getCurrentUser } from "../../utils/auth/authSelectors";
import { UserStatisticsAccessDenied } from "./UserStatisticsAccessDenied";
import { UserDnsQueriesSection } from "../../components/pihole/UserDnsQueriesSection";
import { serverPiHoleEnabled, shouldShowUserDnsQueries } from "../../utils/pihole/serverPiHoleEnabled";



const UI_TO_API_GROUPING: Record<
  Grouping,
  (typeof OverviewGrouping)[keyof typeof OverviewGrouping]
> = {
  auto:   OverviewGrouping.NUMBER_0,
  hours:  OverviewGrouping.NUMBER_1,
  days:   OverviewGrouping.NUMBER_2,
  months: OverviewGrouping.NUMBER_3,
  years:  OverviewGrouping.NUMBER_4,
};

const toApiGrouping = (g: Grouping) => UI_TO_API_GROUPING[g];

const MIN_PROXY_TRAFFIC_FLOW_VERSION = "1.2.5.54";
const OPENVPN_SERVER_TYPE = 0;

function parseVersionParts(raw: string): number[] {
  return raw
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function compareDotVersions(left: string, right: string): number {
  const a = parseVersionParts(left);
  const b = parseVersionParts(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

function getServerFromStatusRow(row: VpnServersDtoVpnServerWithStatusV2Dto) {
  return (
    row.vpnServerResponses?.vpnServer ??
    row.vpnServerResponses?.openVpnServer ??
    row.openVpnServerResponses?.vpnServer ??
    row.openVpnServerResponses?.openVpnServer
  );
}

function withLatLng(s: VpnServerV2Dto): s is VpnServerV2Dto & {
  id: number;
  latitude: number;
  longitude: number;
} {
  return (
    typeof s.id === "number" &&
    typeof s.latitude === "number" &&
    typeof s.longitude === "number" &&
    Number.isFinite(s.latitude) &&
    Number.isFinite(s.longitude)
  );
}

function readPayload<T>(value: T | { data?: T } | undefined): T | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && "data" in value) {
    return (value as { data?: T }).data;
  }
  return value as T;
}

// Strict totals for UI
type SafeTotals = {
  sessionsCount: number;
  usersCount: number;
  trafficInBytes: number;
  trafficOutBytes: number;
  trafficTotalBytes: number;
};

function makeSafeTotals(resp?: OverviewTotalsResponse): SafeTotals {
  const sessionsCount = resp?.totals?.sessionsCount ?? 0;
  const usersCount = resp?.totals?.usersCount ?? 0;
  const trafficInBytes = resp?.totals?.trafficInBytes ?? 0;
  const trafficOutBytes = resp?.totals?.trafficOutBytes ?? 0;
  const trafficTotalBytes =
    resp?.totals?.trafficTotalBytes ?? (trafficInBytes + trafficOutBytes);

  return { sessionsCount, usersCount, trafficInBytes, trafficOutBytes, trafficTotalBytes };
}

export default function ServersOverview() {
  const currentUser = getCurrentUser();
  const currentUserExternalId = (currentUser?.providerExternalId ?? "").trim();

  const { vpnServerId: vpnServerIdParam, externalId: externalIdParam } = useParams<{
    vpnServerId?: string;
    externalId?: string;
  }>();

  const vpnServerId = useMemo(() => {
    if (!vpnServerIdParam) return undefined;
    const n = Number(vpnServerIdParam);
    return Number.isFinite(n) ? n : undefined;
  }, [vpnServerIdParam]);

  const scopedServerQuery = useGetApiOpenVpnServersGetVpnServerId(vpnServerId ?? 0, {
    query: {
      enabled: vpnServerId != null && vpnServerId > 0,
      staleTime: 10_000,
      retry: 1,
    },
  });
  /** OpenVPN and Xray both persist samples in `VpnServerClientTraffic`; wait for server fetch when scoped by id. */
  const overviewChartsEnabled =
    vpnServerId == null ||
    scopedServerQuery.isError ||
    scopedServerQuery.isSuccess;

  const scopedServer = (scopedServerQuery.data as VpnServerResponse | undefined)?.vpnServer;

  const externalId = externalIdParam || undefined;
  const userStatsAccessDenied =
    Boolean(externalId) && !canViewUserStatisticsScope(externalId);
  const statsExternalId = userStatsAccessDenied ? undefined : externalId;

  const scopedServerPiHole = serverPiHoleEnabled(scopedServer);
  const showUserDnsQueries = shouldShowUserDnsQueries(statsExternalId, vpnServerId ?? null, scopedServerPiHole);

  const lastErrorKey = useRef<string>("");

  const showErrorToast = (prefix: string, err: unknown) => {
    const message =
      (typeof err === "string" ? err : errorMessage(err)) || "Unexpected error";
    const key = `${prefix}:${message}`;
    if (lastErrorKey.current !== key) {
      lastErrorKey.current = key;
      toast.error(`${prefix}: ${message}`);
      setTimeout(() => {
        if (lastErrorKey.current === key) lastErrorKey.current = "";
      }, 3000);
    }
  };

  // filters
  const [from, setFrom] = useState<Date>(addDays(startOfToday(), -6));
  const [to, setTo] = useState<Date>(endOfToday());
  const [grouping, setGrouping] = useState<Grouping>("auto");
  const [offlinePlaybackMode, setOfflinePlaybackMode] = useState(false);

  const seriesParams: GetApiOpenVpnClientsOverviewSeriesParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      Grouping: toApiGrouping(grouping),
      VpnServerId: vpnServerId,
      ExternalId: statsExternalId,
    }),
    [from, to, grouping, vpnServerId, statsExternalId]
  );

  const totalsParams: GetApiOpenVpnClientsOverviewSummaryParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      VpnServerId: vpnServerId,
      ExternalId: statsExternalId,
    }),
    [from, to, vpnServerId, statsExternalId]
  );

  // NOTE: no onError inside options.query — not supported by the generated types
  const seriesQuery = useGetApiOpenVpnClientsOverviewSeries(seriesParams, {
    query: {
      enabled: overviewChartsEnabled,
      staleTime: 60_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const totalsQuery = useGetApiOpenVpnClientsOverviewSummary(totalsParams, {
    query: {
      enabled: overviewChartsEnabled,
      staleTime: 60_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const overviewPrimaryReady =
    !seriesQuery.isLoading &&
    !totalsQuery.isLoading &&
    (seriesQuery.isFetched || seriesQuery.isError) &&
    (totalsQuery.isFetched || totalsQuery.isError);

  const usersSeriesQuery = useGetApiOpenVpnClientsOverviewUsersSeries(seriesParams, {
    query: {
      enabled: overviewChartsEnabled && overviewPrimaryReady,
      staleTime: 60_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  // Toast errors via effects
  useEffect(() => {
    if (seriesQuery.isError) showErrorToast("Series load error", seriesQuery.error as unknown);
  }, [seriesQuery.isError, seriesQuery.error]);

  useEffect(() => {
    if (totalsQuery.isError) showErrorToast("Totals load error", totalsQuery.error as unknown);
  }, [totalsQuery.isError, totalsQuery.error]);

  useEffect(() => {
    if (usersSeriesQuery.isError) showErrorToast("Users series load error", usersSeriesQuery.error as unknown);
  }, [usersSeriesQuery.isError, usersSeriesQuery.error]);

  const apiData = seriesQuery.data as OverviewSeriesResponse | undefined;
  const totalsResp = totalsQuery.data as OverviewTotalsResponse | undefined;
  const usersSeriesData = usersSeriesQuery.data as OverviewUsersSeriesResponse | undefined;
  const connectedOnCurrentServerQuery = useGetApiOpenVpnClientsGetAllConnected(
    {
      VpnServerId: vpnServerId ?? 0,
      Page: 1,
      PageSize: 300,
    },
    {
      query: {
        enabled: Boolean(vpnServerId && currentUserExternalId),
        staleTime: 12_000,
        refetchInterval: 15_000,
        retry: 1,
      },
    }
  );

  const isCurrentUserConnectedOnServer = useMemo(() => {
    if (!vpnServerId || !currentUserExternalId) return false;
    const payload = readPayload<VpnServerClientsResponsesConnectedClientsResponse>(
      connectedOnCurrentServerQuery.data as
        | VpnServerClientsResponsesConnectedClientsResponse
        | { data?: VpnServerClientsResponsesConnectedClientsResponse }
        | undefined
    );
    const clients = payload?.vpnClients ?? [];
    return clients.some((client) => (client.externalId ?? "").trim() === currentUserExternalId);
  }, [connectedOnCurrentServerQuery.data, currentUserExternalId, vpnServerId]);

  const loadingSeries = seriesQuery.isFetching || usersSeriesQuery.isFetching;
  const loadingTotals = totalsQuery.isFetching;

  const safeTotals = useMemo(() => makeSafeTotals(totalsResp), [totalsResp]);

  const baseChartData: ChartPoint[] = useMemo(() => {
    const hasSeries = Array.isArray(apiData?.overviewSeriesRows) && apiData.overviewSeriesRows.length > 0;
    if (hasSeries) {
      const g = normalizeGrouping(apiData?.meta?.grouping);
      return toChartPoints(apiData!.overviewSeriesRows!, g);
    }

    const totalsForFallback = {
      servers: 0,
      clients: 0,
      currentIn: 0,
      currentOut: 0,
      totalIn: safeTotals.trafficInBytes,
      totalOut: safeTotals.trafficOutBytes,
      sessions: safeTotals.sessionsCount,
      defaults: 0,
    };

    const fb = buildFallbackOverviewResponse({ from, to, grouping, totals: totalsForFallback });
    const fbGrouping = normalizeGrouping(fb?.meta?.grouping);
    return toChartPoints(fb.overviewSeriesRows ?? [], fbGrouping);
  }, [apiData, from, to, grouping, safeTotals]);

  const usersSeriesPoints = useMemo(() => {
    const rows = usersSeriesData?.rows ?? [];
    const g = normalizeGrouping(usersSeriesData?.meta?.grouping);
    return toUsersSeriesChartPoints(rows, g);
  }, [usersSeriesData]);

  const chartData: MergedChartPoint[] = useMemo(
    () => mergeChartWithUsersSeries(baseChartData, usersSeriesPoints),
    [baseChartData, usersSeriesPoints]
  );

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
  };

  const totalsForCards = useMemo(() => safeTotals, [safeTotals]);

  const overviewLabelParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      ExternalId: statsExternalId,
      VpnServerId: vpnServerId,
    }),
    [from, to, statsExternalId, vpnServerId],
  );

  const usersLabelQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 500 },
    { query: { enabled: Boolean(statsExternalId), staleTime: 60_000 } },
  );

  const overviewLabelQuery = useGetApiOpenVpnClientsOverviewUsers<OverviewUsersResponse>(
    overviewLabelParams,
    {
      query: {
        enabled: Boolean(statsExternalId && overviewLabelParams.From && overviewLabelParams.To),
        staleTime: 10_000,
      },
    },
  );

  const serversLabelQuery = useGetApiV3OpenVpnServersGetAll(
    {},
    { query: { enabled: vpnServerId != null } },
  );

  const userDisplayName = useMemo(() => {
    if (!statsExternalId) return "";
    const payload = readPayload<GetAllUsersResponse>(
      usersLabelQuery.data as GetAllUsersResponse | { data?: GetAllUsersResponse } | undefined
    );
    const fromDash = (payload?.users ?? []).find((u) => u.externalId === statsExternalId)?.displayName?.trim();
    if (fromDash) return fromDash;
    const items = overviewLabelQuery.data?.overviewUserItems ?? [];
    const row =
      items.find((i) => i.externalId === statsExternalId) ?? (items.length > 0 ? items[0] : undefined);
    return row?.displayName?.trim() ?? "";
  }, [statsExternalId, usersLabelQuery.data, overviewLabelQuery.data]);

  const vpnServerDisplayName = useMemo(() => {
    if (vpnServerId == null) return "";
    const payload = readPayload<VpnServersV3Response>(
      serversLabelQuery.data as VpnServersV3Response | { data?: VpnServersV3Response } | undefined
    );
    const list = payload?.vpnServers ?? [];
    const s = list.find((x) => x.id === vpnServerId);
    return s?.serverName?.trim() ?? "";
  }, [serversLabelQuery.data, vpnServerId]);

  const titleUserPart = userDisplayName || "User";
  const titleServerPart =
    vpnServerId != null ? vpnServerDisplayName || `VPN server #${vpnServerId}` : "";

  const title = useMemo(() => {
    if (userStatsAccessDenied) {
      return vpnServerId != null
        ? `Server statistics — ${titleServerPart}`
        : "All servers overview";
    }
    if (statsExternalId && vpnServerId != null) {
      return `User statistics — ${titleUserPart} · ${titleServerPart}`;
    }
    if (statsExternalId) {
      return `User statistics — ${titleUserPart} · all VPN servers`;
    }
    if (vpnServerId != null) {
      return `Server statistics — ${titleServerPart}`;
    }
    return "All servers overview";
  }, [userStatsAccessDenied, statsExternalId, vpnServerId, titleUserPart, titleServerPart]);

  const isGlobalServersPage = vpnServerId == null && !statsExternalId;
  const allServersWithStatusQuery = useGetApiV3OpenVpnServersGetAllWithStatus(
    {},
    {
      query: {
        enabled: isGlobalServersPage,
        staleTime: 15_000,
        refetchInterval: 30_000,
      },
    }
  );
  const allServersListQuery = useGetApiV3OpenVpnServersGetAll(
    {},
    {
      query: {
        enabled: isGlobalServersPage,
        staleTime: 30_000,
        refetchInterval: 30_000,
      },
    }
  );

  const allServerStatuses = useMemo(() => {
    const payload = readPayload<{
      vpnServerWithStatuses?: VpnServersDtoVpnServerWithStatusV2Dto[] | null;
      openVpnServerWithStatuses?: readonly VpnServersDtoVpnServerWithStatusV2Dto[] | null;
    }>(
      allServersWithStatusQuery.data as
        | {
            vpnServerWithStatuses?: VpnServersDtoVpnServerWithStatusV2Dto[] | null;
            openVpnServerWithStatuses?: readonly VpnServersDtoVpnServerWithStatusV2Dto[] | null;
          }
        | {
            data?: {
              vpnServerWithStatuses?: VpnServersDtoVpnServerWithStatusV2Dto[] | null;
              openVpnServerWithStatuses?: readonly VpnServersDtoVpnServerWithStatusV2Dto[] | null;
            };
          }
        | undefined
    );
    const rows =
      payload?.vpnServerWithStatuses ??
      payload?.openVpnServerWithStatuses ??
      [];
    return [...rows];
  }, [allServersWithStatusQuery.data]);

  const allServersList = useMemo<VpnServerV2Dto[]>(() => {
    const payload = readPayload<VpnServersV3Response>(
      allServersListQuery.data as VpnServersV3Response | { data?: VpnServersV3Response } | undefined
    );
    return payload?.vpnServers ?? [];
  }, [allServersListQuery.data]);

  const statusByServerId = useMemo(() => {
    const m = new Map<number, VpnServersDtoVpnServerWithStatusV2Dto>();
    for (const row of allServerStatuses) {
      const id = getServerFromStatusRow(row)?.id;
      if (typeof id === "number" && Number.isFinite(id)) {
        m.set(id, row);
      }
    }
    return m;
  }, [allServerStatuses]);

  const globalFlowEligibleServers = useMemo(() => {
    const candidates = allServersList
      .filter((s) => s.serverType === OPENVPN_SERVER_TYPE && !s.isDeleted && !s.isDisabled)
      .filter(withLatLng);

    return candidates.filter((server) => {
      const statusRow = statusByServerId.get(server.id);
      // Status/version can be missing; in that case keep server eligible.
      const versionRaw = statusRow?.vpnServerStatusLogResponse?.version;
      const version = typeof versionRaw === "string" ? versionRaw.trim() : "";
      if (!version) return true;
      return compareDotVersions(version, MIN_PROXY_TRAFFIC_FLOW_VERSION) >= 0;
    });
  }, [allServersList, statusByServerId]);

  const globalFlowServerIds = useMemo(
    () =>
      globalFlowEligibleServers
        .map((server) => server.id)
        .filter((id): id is number => Number.isFinite(id)),
    [globalFlowEligibleServers]
  );

  const globalFlowServerMarkers = useMemo(
    () =>
      globalFlowEligibleServers.map((server) => {
        return {
          id: server.id as number,
          name: server.serverName?.trim() || `VPN server #${server.id}`,
          position: [server.latitude as number, server.longitude as number] as [number, number],
        };
      }),
    [globalFlowEligibleServers]
  );

  const allConnectedClientsQueries = useQueries({
    queries: globalFlowServerIds.map((serverId) => ({
      queryKey: ["overview-live-connected-clients", serverId],
      enabled: isGlobalServersPage && !offlinePlaybackMode,
      queryFn: () => getApiOpenVpnClientsGetAllConnected({ VpnServerId: serverId, Page: 1, PageSize: 300 }),
      staleTime: 12_000,
      refetchInterval: 15_000,
      retry: 1,
    })),
  });

  const globalLiveClients = useMemo(() => {
    const all: VpnClientInfoDto[] = [];
    for (const q of allConnectedClientsQueries) {
      const payload = readPayload<VpnServerClientsResponsesConnectedClientsResponse>(
        q.data as
          | VpnServerClientsResponsesConnectedClientsResponse
          | { data?: VpnServerClientsResponsesConnectedClientsResponse }
          | undefined
      );
      const rows =
        payload?.vpnClients ?? [];
      for (const row of rows) all.push(row);
    }
    return all;
  }, [allConnectedClientsQueries]);

  const offlineOverviewQueryParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      VpnServerId: vpnServerId ?? undefined,
      ExternalId: statsExternalId ?? undefined,
    }),
    [from, to, vpnServerId, statsExternalId]
  );

  const offlineOverviewUsersQuery = useGetApiOpenVpnClientsOverviewUsers<OverviewUsersResponse>(
    offlineOverviewQueryParams,
    {
      query: {
        enabled: isGlobalServersPage && offlinePlaybackMode,
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 1,
      },
    }
  );

  const offlineOverviewPointsQuery = useGetApiOpenVpnClientsOverviewPoints(offlineOverviewQueryParams, {
    query: {
      enabled: isGlobalServersPage && offlinePlaybackMode,
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
  });

  const offlinePlaybackUsers = useMemo(() => {
    const rows = (offlineOverviewUsersQuery.data?.overviewUserItems ?? []) as OverviewUserDto[];
    return rows.slice(0, 1200);
  }, [offlineOverviewUsersQuery.data]);

  const offlinePlaybackPoints = useMemo(() => {
    const payload = readPayload<{ geoPointAggs?: VpnServerClientsDtoGeoPointAggDto[] | null }>(
      offlineOverviewPointsQuery.data as
        | { geoPointAggs?: VpnServerClientsDtoGeoPointAggDto[] | null }
        | { data?: { geoPointAggs?: VpnServerClientsDtoGeoPointAggDto[] | null } }
        | undefined
    );
    return (payload?.geoPointAggs ?? [])
      .filter(
        (p): p is VpnServerClientsDtoGeoPointAggDto & { latitude: number; longitude: number } =>
          typeof p.latitude === "number" &&
          Number.isFinite(p.latitude) &&
          typeof p.longitude === "number" &&
          Number.isFinite(p.longitude)
      )
      .filter((p) => ((p.totalBytesIn ?? 0) + (p.totalBytesOut ?? 0)) > 0)
      .slice(0, 600);
  }, [offlineOverviewPointsQuery.data]);

  const offlinePlaybackData = useMemo(() => {
    if (!offlinePlaybackMode) {
      return { clients: [] as VpnClientInfoDto[], flows: [] as ProxyTrafficFlowUpdate[] };
    }
    if (globalFlowServerMarkers.length === 0 || offlinePlaybackPoints.length === 0) {
      return { clients: [] as VpnClientInfoDto[], flows: [] as ProxyTrafficFlowUpdate[] };
    }

    const users = offlinePlaybackUsers.length > 0 ? offlinePlaybackUsers : [];
    const syntheticUsers =
      users.length > 0
        ? users
        : offlinePlaybackPoints.map((p, idx) => ({
            externalId: `geo:${idx + 1}`,
            displayName: [p.country, p.region].filter(Boolean).join(", ") || `Geo point ${idx + 1}`,
            vpnServerId: null,
            sessions: p.sessionsCount ?? 1,
            trafficInBytes: p.totalBytesIn ?? 0,
            trafficOutBytes: p.totalBytesOut ?? 0,
            trafficTotalBytes: (p.totalBytesIn ?? 0) + (p.totalBytesOut ?? 0),
            firstSeen: undefined,
          }));

    const serverIdSet = new Set(globalFlowServerMarkers.map((s) => s.id));
    const markerById = new Map(globalFlowServerMarkers.map((s) => [s.id, s]));
    const nowIso = new Date().toISOString();

    const clients: VpnClientInfoDto[] = syntheticUsers.map((u, idx) => {
      const point = offlinePlaybackPoints[idx % offlinePlaybackPoints.length];
      const fallbackServerId = globalFlowServerMarkers[idx % globalFlowServerMarkers.length]?.id;
      const candidateServerId = u.vpnServerId ?? fallbackServerId ?? null;
      const serverId =
        typeof candidateServerId === "number" && serverIdSet.has(candidateServerId)
          ? candidateServerId
          : fallbackServerId ?? null;
      const externalId = (u.externalId ?? "").trim() || `offline-user-${idx + 1}`;
      const pseudoIp = `offline-user-${idx + 1}`;
      const displayName = u.displayName?.trim() || externalId;

      const pointIn = point.totalBytesIn ?? 0;
      const pointOut = point.totalBytesOut ?? 0;
      const userIn = u.trafficInBytes ?? 0;
      const userOut = u.trafficOutBytes ?? 0;
      const bytesReceived = Math.max(userIn, pointIn);
      const bytesSent = Math.max(userOut, pointOut);

      return {
        id: idx + 1,
        vpnServerId: serverId ?? undefined,
        externalId,
        displayName,
        commonName: displayName,
        remoteIp: pseudoIp,
        proxyRealIp: pseudoIp,
        country: point.country,
        region: point.region,
        city: point.region,
        latitude: point.latitude,
        longitude: point.longitude,
        bytesReceived,
        bytesSent,
        connectedSince: u.firstSeen ?? nowIso,
        isConnected: true,
      };
    });

    const activeClients = clients.filter((c) => ((c.bytesReceived ?? 0) + (c.bytesSent ?? 0)) > 0);

    const flows: ProxyTrafficFlowUpdate[] = activeClients.map((client, idx) => {
      const sid =
        typeof client.vpnServerId === "number" && markerById.has(client.vpnServerId)
          ? client.vpnServerId
          : globalFlowServerMarkers[idx % globalFlowServerMarkers.length]!.id;
      const user = syntheticUsers[idx];
      const baseIn = Math.max(1, user.trafficInBytes ?? 0);
      const baseOut = Math.max(1, user.trafficOutBytes ?? 0);
      const waveA = ((idx * 3) % 10) + 1;
      const waveB = ((idx * 5) % 10) + 1;
      const c2sDelta = 40 + waveA * 35;
      const s2cDelta = 50 + waveB * 45;
      const emittedIso = new Date(new Date(nowIso).getTime() + idx).toISOString();
      const connectionId = `offline:${client.externalId ?? idx + 1}:${sid}`;

      return {
        serverId: sid,
        connectionId,
        protocol: "tcp",
        state: "connected",
        isConnected: true,
        isIdle: false,
        realClientIp: client.proxyRealIp ?? client.remoteIp ?? `offline-user-${idx + 1}`,
        realClientPort: 0,
        clientRef: client.externalId ?? null,
        userId: client.externalId ?? null,
        username: client.displayName ?? client.commonName ?? client.externalId ?? null,
        email: null,
        localProxyIp: "::ffff:127.0.0.1",
        localProxyPort: 0,
        targetIp: "::ffff:127.0.0.1",
        targetPort: 0,
        clientToServerBytesTotal: baseIn + c2sDelta * 10,
        serverToClientBytesTotal: baseOut + s2cDelta * 10,
        clientToServerBytesDelta: c2sDelta,
        serverToClientBytesDelta: s2cDelta,
        connectedAtUtc: client.connectedSince ?? nowIso,
        lastActivityAtUtc: emittedIso,
        emittedAtUtc: emittedIso,
        errorMessage: null,
      };
    });

    return { clients: activeClients, flows };
  }, [
    offlinePlaybackMode,
    offlinePlaybackUsers,
    offlinePlaybackPoints,
    globalFlowServerMarkers,
  ]);

  const globalFlowHub = useProxyTrafficFlowMany(
    isGlobalServersPage && !offlinePlaybackMode,
    globalFlowServerIds
  );

  if (vpnServerId != null && scopedServerQuery.isPending) {
    return (
      <div
        style={{
          padding: 16,
          backgroundColor: "var(--bg-content)",
          color: "var(--text-secondary)",
          minHeight: "100vh",
        }}
      >
        <h2 className="settings-page__h2-with-icon">
          <FaChartLine className="icon" aria-hidden />
          <span>Server statistics</span>
        </h2>
        <p>Loading server…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, backgroundColor: "var(--bg-content)", color: "var(--text-secondary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h2 className="settings-page__h2-with-icon" style={{ margin: 0 }}>
          <FaChartLine className="icon" aria-hidden />
          <span>{title}</span>
        </h2>
      </div>

      {userStatsAccessDenied ? (
        <UserStatisticsAccessDenied vpnServerId={vpnServerId} />
      ) : null}

      <StatisticsScopeBanner
        externalId={statsExternalId}
        vpnServerId={vpnServerId}
        userDisplayName={userDisplayName}
        vpnServerDisplayName={vpnServerDisplayName}
      />
      {vpnServerId != null && isCurrentUserConnectedOnServer ? (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--accent-color)",
            background: "color-mix(in srgb, var(--accent-color) 10%, transparent)",
            fontSize: 14,
          }}
        >
          You are currently connected to this server.
        </div>
      ) : null}

      {statsExternalId ? (
        <OverviewUserProfileCard
          externalId={statsExternalId}
          vpnServerId={vpnServerId}
          from={from}
          to={to}
        />
      ) : null}

      {showUserDnsQueries ? (
        <UserDnsQueriesSection
          externalId={statsExternalId}
          vpnServerId={vpnServerId ?? 0}
          compact
        />
      ) : null}

      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      <StatsCards totals={totalsForCards} loading={loadingTotals} />
      <OverviewChart data={chartData} loading={loadingSeries} error={null} />

      <Suspense fallback={<p style={{ margin: "12px 0" }}>Loading users table…</p>}>
        <OverviewUsersTable
          from={from}
          to={to}
          vpnServerId={vpnServerId ?? null}
          externalId={statsExternalId ?? null}
          currentUserExternalId={currentUserExternalId || null}
        />
      </Suspense>

      {isGlobalServersPage ? (
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 8px" }}>Live proxy traffic map (all OpenVPN servers)</h3>
          <div style={{ margin: "0 0 8px", display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
              <input
                id="overview-offline-playback-mode"
                name="overviewOfflinePlaybackMode"
                type="checkbox"
                checked={offlinePlaybackMode}
                onChange={(e) => setOfflinePlaybackMode(e.target.checked)}
              />
              Offline mode (looped animation from filtered overview data)
            </label>
            {offlinePlaybackMode ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  void offlineOverviewUsersQuery.refetch();
                  void offlineOverviewPointsQuery.refetch();
                }}
              >
                Refresh offline data
              </button>
            ) : null}
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 12, opacity: 0.88 }}>
            Stream:{" "}
            <code>{offlinePlaybackMode ? "offline-playback" : globalFlowHub.connectionState}</code>
            {!offlinePlaybackMode && globalFlowHub.lastError ? ` (${globalFlowHub.lastError})` : ""} | Servers:{" "}
            {globalFlowServerIds.length} | Clients:{" "}
            {offlinePlaybackMode ? offlinePlaybackData.clients.length : globalLiveClients.length}
          </p>
          <h4 style={{ margin: "16px 0 8px" }}>All active connections map</h4>
          <div style={{ marginTop: 8, paddingTop: 6 }}>
            <Suspense fallback={<p>Loading traffic map…</p>}>
              <VpnMap
                clients={offlinePlaybackMode ? offlinePlaybackData.clients : globalLiveClients}
                trafficFlows={offlinePlaybackMode ? offlinePlaybackData.flows : globalFlowHub.flows}
                serverMarkers={globalFlowServerMarkers}
                animationMode={offlinePlaybackMode ? "offline" : "live"}
              />
            </Suspense>
          </div>
        </section>
      ) : null}

      <GeoMap from={from} to={to} vpnServerId={vpnServerId ?? null} externalId={statsExternalId ?? null} />
    </div>
  );
}
