// src/pages/servers/ServersOverview.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaChartLine } from "react-icons/fa";

import { errorMessage } from "../../utils/errorMessage";
import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import { OverviewUsersTable } from "../../components/OverviewUsersTable";
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
  useGetApiOpenVpnClientsOverviewSeries,
  useGetApiOpenVpnClientsOverviewSummary,
  useGetApiOpenVpnClientsOverviewUsers,
  useGetApiOpenVpnClientsOverviewUsersSeries,
} from "../../api/orval/vpn-server-clients/vpn-server-clients";
import { useGetApiOpenVpnServersGetVpnServerId } from "../../api/orval/vpn-servers/vpn-servers";
import {
  useGetApiV2OpenVpnServersGetAll,
  useGetApiV2OpenVpnServersGetAllWithStatus,
} from "../../api/orval/vpn-servers-v2/vpn-servers-v2";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type {
  GetAllUsersResponse,
  OverviewSeriesResponse,
  OverviewTotalsResponse,
  OverviewUsersResponse,
  OverviewUsersSeriesResponse,
  VpnClientInfoDto,
  VpnServerClientsResponsesConnectedClientsResponse,
  VpnServerV2Dto,
  VpnServersDtoVpnServerWithStatusV2Dto,
  VpnServersV2Response,
  GetApiOpenVpnClientsOverviewSeriesParams,
  GetApiOpenVpnClientsOverviewSummaryParams,
} from "../../api/orvalModelShim";
import { OverviewGrouping } from "../../api/orvalModelShim";
import VpnMap from "../../components/VpnMap";
import { useProxyTrafficFlowMany } from "../../hooks/useProxyTrafficFlow";



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

  const externalId = externalIdParam || undefined;

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

  const seriesParams: GetApiOpenVpnClientsOverviewSeriesParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      Grouping: toApiGrouping(grouping),
      VpnServerId: vpnServerId,
      ExternalId: externalId,
    }),
    [from, to, grouping, vpnServerId, externalId]
  );

  const totalsParams: GetApiOpenVpnClientsOverviewSummaryParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      VpnServerId: vpnServerId,
      ExternalId: externalId,
    }),
    [from, to, vpnServerId, externalId]
  );

  // NOTE: no onError inside options.query — not supported by the generated types
  const seriesQuery = useGetApiOpenVpnClientsOverviewSeries(seriesParams, {
    query: {
      enabled: overviewChartsEnabled,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const totalsQuery = useGetApiOpenVpnClientsOverviewSummary(totalsParams, {
    query: {
      enabled: overviewChartsEnabled,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const usersSeriesQuery = useGetApiOpenVpnClientsOverviewUsersSeries(seriesParams, {
    query: {
      enabled: overviewChartsEnabled,
      staleTime: 10_000,
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
      ExternalId: externalId,
      VpnServerId: vpnServerId,
    }),
    [from, to, externalId, vpnServerId],
  );

  const usersLabelQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 500 },
    { query: { enabled: Boolean(externalId), staleTime: 60_000 } },
  );

  const overviewLabelQuery = useGetApiOpenVpnClientsOverviewUsers<OverviewUsersResponse>(
    overviewLabelParams,
    {
      query: {
        enabled: Boolean(externalId && overviewLabelParams.From && overviewLabelParams.To),
        staleTime: 10_000,
      },
    },
  );

  const serversLabelQuery = useGetApiV2OpenVpnServersGetAll(
    {},
    { query: { enabled: vpnServerId != null } },
  );

  const userDisplayName = useMemo(() => {
    if (!externalId) return "";
    const payload = readPayload<GetAllUsersResponse>(
      usersLabelQuery.data as GetAllUsersResponse | { data?: GetAllUsersResponse } | undefined
    );
    const fromDash = (payload?.users ?? []).find((u) => u.externalId === externalId)?.displayName?.trim();
    if (fromDash) return fromDash;
    const items = overviewLabelQuery.data?.overviewUserItems ?? [];
    const row =
      items.find((i) => i.externalId === externalId) ?? (items.length > 0 ? items[0] : undefined);
    return row?.displayName?.trim() ?? "";
  }, [externalId, usersLabelQuery.data, overviewLabelQuery.data]);

  const vpnServerDisplayName = useMemo(() => {
    if (vpnServerId == null) return "";
    const payload = readPayload<VpnServersV2Response>(
      serversLabelQuery.data as VpnServersV2Response | { data?: VpnServersV2Response } | undefined
    );
    const list = payload?.vpnServers ?? [];
    const s = list.find((x) => x.id === vpnServerId);
    return s?.serverName?.trim() ?? "";
  }, [serversLabelQuery.data, vpnServerId]);

  const titleUserPart = userDisplayName || "User";
  const titleServerPart =
    vpnServerId != null ? vpnServerDisplayName || `VPN server #${vpnServerId}` : "";

  const title = useMemo(() => {
    if (externalId && vpnServerId != null) {
      return `User statistics — ${titleUserPart} · ${titleServerPart}`;
    }
    if (externalId) {
      return `User statistics — ${titleUserPart} · all VPN servers`;
    }
    if (vpnServerId != null) {
      return `Server statistics — ${titleServerPart}`;
    }
    return "All servers overview";
  }, [externalId, vpnServerId, titleUserPart, titleServerPart]);

  const isGlobalServersPage = vpnServerId == null && !externalId;
  const allServersWithStatusQuery = useGetApiV2OpenVpnServersGetAllWithStatus(
    {},
    {
      query: {
        enabled: isGlobalServersPage,
        staleTime: 15_000,
        refetchInterval: 30_000,
      },
    }
  );
  const allServersListQuery = useGetApiV2OpenVpnServersGetAll(
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
    const payload = readPayload<VpnServersV2Response>(
      allServersListQuery.data as VpnServersV2Response | { data?: VpnServersV2Response } | undefined
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

  useEffect(() => {
    if (!isGlobalServersPage) return;

    const payload = globalFlowEligibleServers.map((server) => {
      const status = statusByServerId.get(server.id);
      const versionRaw = status?.vpnServerStatusLogResponse?.version;
      const version = typeof versionRaw === "string" ? versionRaw.trim() : "";
      return {
        id: server.id,
        name: server.serverName?.trim() || `VPN server #${server.id}`,
        version: version || null,
        latitude: server.latitude ?? null,
        longitude: server.longitude ?? null,
      };
    });

    // eslint-disable-next-line no-console
    console.info("[TrafficFlowOverview] map subscriptions", {
      serversCount: globalFlowServerIds.length,
      serverIds: globalFlowServerIds,
      servers: payload,
    });
  }, [isGlobalServersPage, globalFlowEligibleServers, globalFlowServerIds, statusByServerId]);

  const allConnectedClientsQueries = useQueries({
    queries: globalFlowServerIds.map((serverId) => ({
      queryKey: ["overview-live-connected-clients", serverId],
      enabled: isGlobalServersPage,
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

  const globalFlowHub = useProxyTrafficFlowMany(isGlobalServersPage, globalFlowServerIds);

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

      <StatisticsScopeBanner
        externalId={externalId}
        vpnServerId={vpnServerId}
        userDisplayName={userDisplayName}
        vpnServerDisplayName={vpnServerDisplayName}
      />

      {externalId ? (
        <OverviewUserProfileCard
          externalId={externalId}
          vpnServerId={vpnServerId}
          from={from}
          to={to}
        />
      ) : null}

      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      <StatsCards totals={totalsForCards} loading={loadingTotals} />
      <OverviewChart data={chartData} loading={loadingSeries} error={null} />

      <OverviewUsersTable
        from={from}
        to={to}
        vpnServerId={vpnServerId ?? null}
        externalId={externalId ?? null}
      />

      {isGlobalServersPage ? (
        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 8px" }}>Live proxy traffic map (all OpenVPN servers)</h3>
          <p style={{ margin: "0 0 10px", fontSize: 12, opacity: 0.88 }}>
            Stream: <code>{globalFlowHub.connectionState}</code>
            {globalFlowHub.lastError ? ` (${globalFlowHub.lastError})` : ""} | Servers: {globalFlowServerIds.length} | Clients:{" "}
            {globalLiveClients.length}
          </p>
          <VpnMap
            clients={globalLiveClients}
            trafficFlows={globalFlowHub.flows}
            serverMarkers={globalFlowServerMarkers}
          />
        </section>
      ) : null}

      <GeoMap from={from} to={to} vpnServerId={vpnServerId ?? null} externalId={externalId ?? null} />
    </div>
  );
}
