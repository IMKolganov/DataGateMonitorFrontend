import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DateRangeFilter, { type Grouping, type DateRangeChange } from "../../components/DateRangeFilter";
import { fetchOverviewSeries, fetchOverviewTotals } from "../../utils/api/OpenVpnServerClients";
import { type OverviewTotalsResponse, type OverviewSeriesResponse } from "../../utils/types";
import StatsCards from "./StatsCards";
import OverviewChart from "./OverviewChart";
import GeoMap from "./GeoMap";
import { addDays, endOfToday, startOfToday, toChartPoints, buildFallbackOverviewResponse } from "./helpers";
import type { ChartPoint } from "./types";

export default function ServersOverview() {
  // Read params for scoping: works for /servers and /servers/:vpnServerId/statistics/:externalId?
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

  // dedupe toast spam
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

  // backend state: series
  const [apiData, setApiData] = useState<OverviewSeriesResponse | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // backend state: totals
  const [totalsResp, setTotalsResp] = useState<OverviewTotalsResponse | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);

  // fetch series
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingSeries(true);
        const data = await fetchOverviewSeries({
          from,
          to,
          grouping,
          vpnServerId,     // number | undefined
          externalId,      // string | undefined
        });
        if (!cancelled) setApiData(data);
      } catch (e) {
        if (!cancelled) showErrorToast("Series load error", e);
      } finally {
        if (!cancelled) setLoadingSeries(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to, grouping, vpnServerId, externalId]);

  // fetch totals
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTotals(true);
        const t = await fetchOverviewTotals({
          from,
          to,
          vpnServerId,
          externalId,
        });
        if (!cancelled) setTotalsResp(t);
      } catch (e) {
        if (!cancelled) showErrorToast("Totals load error", e);
      } finally {
        if (!cancelled) setLoadingTotals(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to, vpnServerId, externalId]);

  // chart data with fallback
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
          totalIn: totalsResp.totals.trafficInBytes,
          totalOut: totalsResp.totals.trafficOutBytes,
          sessions: totalsResp.totals.sessionsCount,
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

  const totalsForCards = useMemo(() => {
    return totalsResp?.totals ?? {
      sessionsCount: 0,
      usersCount: 0,
      trafficInBytes: 0,
      trafficOutBytes: 0,
      trafficTotalBytes: 0,
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

      {/* If GeoMap supports scoping, pass both vpnServerId and externalId */}
      <GeoMap from={from} to={to} vpnServerId={vpnServerId ?? null} externalId={externalId ?? null} />
    </div>
  );
}