// src/pages/servers/ServersOverview.tsx
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import { OverviewUsersTable } from "../../components/OverviewUsersTable";

import StatsCards from "./StatsCards";
import OverviewChart from "./OverviewChart";
import GeoMap from "./GeoMap";
import { addDays, endOfToday, startOfToday, toChartPoints, buildFallbackOverviewResponse } from "./helpers";
import type { ChartPoint } from "./types"; 

import { keepPreviousData } from "@tanstack/react-query";

// orval hooks & types
import {
  useGetApiOpenVpnClientsOverviewSeries,
  useGetApiOpenVpnClientsOverviewSummary,
} from "../../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import type {
  OverviewSeriesResponse,
  OverviewTotalsResponse,
  GetApiOpenVpnClientsOverviewSeriesParams,
  GetApiOpenVpnClientsOverviewSummaryParams,
  TotalsPayloadDto,
} from "../../api/orval/model";
import { OverviewGrouping } from "../../api/orval/model";

const UI_TO_API_GROUPING: Record<Grouping, (typeof OverviewGrouping)[keyof typeof OverviewGrouping]> = {
  auto: OverviewGrouping.NUMBER_0,
  hour: OverviewGrouping.NUMBER_1,
  day:  OverviewGrouping.NUMBER_2,
};

const toApiGrouping = (g: Grouping) => UI_TO_API_GROUPING[g];

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
      (err as any)?.message ||
      (typeof err === "string" ? err : "") ||
      "Unexpected error";
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

  const seriesQuery = useGetApiOpenVpnClientsOverviewSeries(seriesParams, {
    query: {
      enabled: true,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
      onError: (e) => showErrorToast("Series load error", e),
    },
  });

  const totalsQuery = useGetApiOpenVpnClientsOverviewSummary(totalsParams, {
    query: {
      enabled: true,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
      onError: (e) => showErrorToast("Totals load error", e),
    },
  });

  const apiData = seriesQuery.data as OverviewSeriesResponse | undefined;
  const totalsResp = totalsQuery.data as OverviewTotalsResponse | undefined;

  const loadingSeries = seriesQuery.isFetching;
  const loadingTotals = totalsQuery.isFetching;

  // Chart data with fallback
  const chartData: ChartPoint[] = useMemo(() => {
    if (apiData?.series?.length) {
      return toChartPoints(apiData.series, apiData.meta.grouping);
    }

    const totalsForFallback = totalsResp
      ? {
          servers: 0,
          clients: 0,
          currentIn: 0,
          currentOut: 0,
          totalIn: totalsResp.totals.trafficInBytes ?? 0,
          totalOut: totalsResp.totals.trafficOutBytes ?? 0,
          sessions: totalsResp.totals.sessionsCount ?? 0,
          defaults: 0,
        }
      : {
          servers: 0,
          clients: 0,
          currentIn: 0,
          currentOut: 0,
          totalIn: 0,
          totalOut: 0,
          sessions: 0,
          defaults: 0,
        };

    const fb = buildFallbackOverviewResponse({ from, to, grouping, totals: totalsForFallback });
    return toChartPoints(fb.series, fb.meta.grouping);
  }, [apiData, totalsResp, from, to, grouping]);

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
  };

  const totalsForCards: TotalsPayloadDto = useMemo(() => {
    const sessionsCount = totalsResp?.totals.sessionsCount ?? 0;
    const usersCount = totalsResp?.totals.usersCount ?? 0;
    const trafficInBytes = totalsResp?.totals.trafficInBytes ?? 0;
    const trafficOutBytes = totalsResp?.totals.trafficOutBytes ?? 0;
    const trafficTotalBytes =
      totalsResp?.totals.trafficTotalBytes ??
      (trafficInBytes + trafficOutBytes);

    return {
      sessionsCount,
      usersCount,
      trafficInBytes,
      trafficOutBytes,
      trafficTotalBytes,
    };
  }, [totalsResp]);

  const title = vpnServerId
    ? externalId
      ? `Server Statistics (server #${vpnServerId}, externalId: ${externalId})`
      : `Server Statistics (server #${vpnServerId})`
    : "All Servers Overview";

  return (
    <div style={{ padding: 16, backgroundColor: "#161b22", color: "#c9d1d9", minHeight: "100vh" }}>
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
