import { useEffect, useMemo, useState } from "react";
import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import { fetchOverviewSeries, type OverviewSeriesResponse } from "../../utils/api";
import StatsCards from "./StatsCards";
import OverviewChart from "./OverviewChart";
import GeoMap from "./GeoMap";
import {
  addDays, endOfToday, startOfToday,
  toChartPoints, buildFallbackOverviewResponse,
} from "./helpers";
import { mockServers } from "./helpers";
import type { ChartPoint } from "./types";

export default function ServersOverview() {
  const totals = useMemo(() => {
    const serversCount = mockServers.length;
    const clients = mockServers.reduce((s, x) => s + x.connectedClients, 0);
    const currentIn = mockServers.reduce((s, x) => s + x.trafficInBytes, 0);
    const currentOut = mockServers.reduce((s, x) => s + x.trafficOutBytes, 0);
    const totalIn = mockServers.reduce((s, x) => s + x.totalTrafficInBytes, 0);
    const totalOut = mockServers.reduce((s, x) => s + x.totalTrafficOutBytes, 0);
    const sessions = mockServers.reduce((s, x) => s + x.sessionsCount, 0);
    const defaults = mockServers.filter((x) => x.isDefault).length;
    return { servers: serversCount, clients, currentIn, currentOut, totalIn, totalOut, sessions, defaults };
  }, []);

  // filters
  const [from, setFrom] = useState<Date>(addDays(startOfToday(), -6));
  const [to,   setTo]   = useState<Date>(endOfToday());
  const [grouping, setGrouping] = useState<Grouping>("auto");

  // backend state
  const [apiData, setApiData] = useState<OverviewSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // fetch on filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOverviewSeries({
          from, to, grouping,
          vpnServerId: undefined,
          externalId: undefined,
        });
        if (!cancelled) setApiData(data);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load data");
          setApiData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to, grouping]);

  // chart data: prefer backend, else fallback
  const chartData: ChartPoint[] = useMemo(() => {
    if (apiData?.series?.length) {
      return toChartPoints(apiData.series, apiData.meta.grouping);
    }
    const fb = buildFallbackOverviewResponse({ from, to, grouping, totals });
    return toChartPoints(fb.series, fb.meta.grouping);
  }, [apiData, from, to, grouping, totals]);

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
  };

  return (
    <div style={{ padding: 16, backgroundColor: "#161b22", color: "#c9d1d9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>All Servers Overview</h2>
        <span style={{ opacity: 0.7 }}>({totals.servers} servers)</span>
      </div>

      {/* Totals */}
      <StatsCards totals={totals} />

      {/* Date range filter */}
      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />

      {/* Chart */}
      <OverviewChart data={chartData} loading={loading} error={error} />

      <GeoMap from={from} to={to} />
    </div>
  );
}
