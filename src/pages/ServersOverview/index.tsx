// src/pages/servers/ServersOverview.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { errorMessage } from "../../utils/errorMessage";
import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import { OverviewUsersTable } from "../../components/OverviewUsersTable";
import StatsCards from "./StatsCards";
import OverviewChart from "./OverviewChart";
import GeoMap from "./GeoMap";
import { addDays, endOfToday, startOfToday, toChartPoints, toUsersSeriesChartPoints, mergeChartWithUsersSeries, buildFallbackOverviewResponse, normalizeGrouping } from "./helpers";
import type { ChartPoint, MergedChartPoint } from "./types";

import { keepPreviousData } from "@tanstack/react-query";

// orval hooks & types
import {
  useGetApiOpenVpnClientsOverviewSeries,
  useGetApiOpenVpnClientsOverviewSummary,
  useGetApiOpenVpnClientsOverviewUsersSeries,
} from "../../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import type {
  OverviewSeriesResponse,
  OverviewTotalsResponse,
  OverviewUsersSeriesResponse,
  GetApiOpenVpnClientsOverviewSeriesParams,
  GetApiOpenVpnClientsOverviewSummaryParams,
} from "../../api/orval/model";
import { OverviewGrouping } from "../../api/orval/model";



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
      enabled: true,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const totalsQuery = useGetApiOpenVpnClientsOverviewSummary(totalsParams, {
    query: {
      enabled: true,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const usersSeriesQuery = useGetApiOpenVpnClientsOverviewUsersSeries(seriesParams, {
    query: {
      enabled: true,
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

  const title = vpnServerId
    ? externalId
      ? `Server Statistics (server #${vpnServerId}, externalId: ${externalId})`
      : `Server Statistics (server #${vpnServerId})`
    : "All Servers Overview";

  return (
    <div style={{ padding: 16, backgroundColor: "var(--bg-content)", color: "var(--text-secondary)", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      <StatsCards totals={totalsForCards} loading={loadingTotals} />
      <OverviewChart data={chartData} loading={loadingSeries} error={null} />

      <OverviewUsersTable
        from={from}
        to={to}
        vpnServerId={vpnServerId ?? null}
        externalId={externalId ?? null}
      />

      <GeoMap from={from} to={to} vpnServerId={vpnServerId ?? null} externalId={externalId ?? null} />
    </div>
  );
}
