import { useMemo, useState } from "react";
import { FaChartLine, FaGlobe } from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DateRangeFilter, { type DateRangeChange, type Grouping } from "../../components/DateRangeFilter";
import { keepPreviousData } from "@tanstack/react-query";
import { useGetApiOpenVpnClientsOverviewUsersSeries } from "../../api/orval/vpn-server-clients/vpn-server-clients";
import { OverviewGrouping } from "../../api/orvalModelShim";
import type {
  GetApiOpenVpnClientsOverviewUsersSeriesParams,
  OverviewUsersSeriesResponse,
} from "../../api/orvalModelShim";
import type { OverviewUsersSeriesResponseApiResponse } from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { isCanceledError } from "../../utils/queryCanceled";
import GeoMap from "../ServersOverview/GeoMap";
import {
  addDays,
  endOfToday,
  formatLabel,
  normalizeGrouping,
  startOfToday,
  toUsersSeriesChartPoints,
} from "../ServersOverview/helpers";

const UI_TO_API_GROUPING: Record<
  Grouping,
  (typeof OverviewGrouping)[keyof typeof OverviewGrouping]
> = {
  auto: OverviewGrouping.NUMBER_0,
  tenminutes: OverviewGrouping.NUMBER_5,
  hours: OverviewGrouping.NUMBER_1,
  days: OverviewGrouping.NUMBER_2,
  months: OverviewGrouping.NUMBER_3,
  years: OverviewGrouping.NUMBER_4,
};

function toApiGrouping(g: Grouping) {
  return UI_TO_API_GROUPING[g];
}

/** Fixed px height avoids Recharts measuring 0×0 in flex layouts. */
const CHART_PX = 260;

export type UserVpnConnectionsSectionProps = {
  externalId: string | null | undefined;
};

export function UserVpnConnectionsSection({ externalId }: UserVpnConnectionsSectionProps) {
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const hasVpnIdentity = ext.length > 0;

  const [from, setFrom] = useState(() => addDays(startOfToday(), -29));
  const [to, setTo] = useState(() => endOfToday());
  const [grouping, setGrouping] = useState<Grouping>("auto");

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
  };

  const seriesParams: GetApiOpenVpnClientsOverviewUsersSeriesParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      Grouping: toApiGrouping(grouping),
      ExternalId: ext || undefined,
    }),
    [from, to, grouping, ext],
  );

  const usersSeriesQuery = useGetApiOpenVpnClientsOverviewUsersSeries(seriesParams, {
    query: {
      enabled: hasVpnIdentity,
      staleTime: 10_000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const seriesPayload = useMemo(() => {
    const raw = usersSeriesQuery.data as
      | OverviewUsersSeriesResponse
      | OverviewUsersSeriesResponseApiResponse
      | ApiEnvelope<OverviewUsersSeriesResponse>
      | undefined;
    return unwrapMaybeApiResponse<OverviewUsersSeriesResponse>(raw as never);
  }, [usersSeriesQuery.data]);

  const seriesMode = useMemo(
    () => normalizeGrouping(seriesPayload?.meta?.grouping),
    [seriesPayload?.meta?.grouping],
  );

  const chartPoints = useMemo(() => {
    const rows = [...(seriesPayload?.rows ?? [])].sort((a, b) => {
      const ta = a.ts ? new Date(a.ts).getTime() : 0;
      const tb = b.ts ? new Date(b.ts).getTime() : 0;
      return ta - tb;
    });
    return toUsersSeriesChartPoints(rows, seriesMode);
  }, [seriesPayload?.rows, seriesMode]);

  const activitySummary = useMemo(() => {
    const rows = seriesPayload?.rows ?? [];
    let activePeriods = 0;
    let lastActiveTs: string | null = null;
    let lastActiveSessions = 0;

    for (const r of rows) {
      const sessions = r.activeSessions ?? 0;
      if (sessions <= 0 || !r.ts) continue;
      activePeriods += 1;
      const t = new Date(r.ts).getTime();
      if (Number.isNaN(t)) continue;
      if (!lastActiveTs || t >= new Date(lastActiveTs).getTime()) {
        lastActiveTs = r.ts;
        lastActiveSessions = sessions;
      }
    }

    return {
      peakSessions: seriesPayload?.summary?.peakActiveSessions ?? null,
      peakAt: seriesPayload?.summary?.peakActiveSessionsAt ?? null,
      activePeriods,
      lastActiveTs,
      lastActiveSessions,
    };
  }, [seriesPayload?.rows, seriesPayload?.summary]);

  const hasAnyActivity = activitySummary.activePeriods > 0;
  const loading = usersSeriesQuery.isLoading || usersSeriesQuery.isFetching;

  const errMsg = isCanceledError(usersSeriesQuery.error)
    ? null
    : usersSeriesQuery.error instanceof Error
      ? usersSeriesQuery.error.message
      : usersSeriesQuery.error
        ? "Failed to load session activity"
        : null;

  if (!hasVpnIdentity) {
    return (
      <section className="settings-card" style={{ marginBottom: 24 }}>
        <h3 className="settings-card__h3-with-icon">
          <FaGlobe className="icon" aria-hidden />
          <span>VPN connections</span>
        </h3>
        <p className="settings-item-description">
          Map and per-period VPN statistics require an OpenVPN <strong>external ID</strong> on this account. Telegram-only
          users without a linked VPN identity will not appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="settings-card" style={{ marginBottom: 24 }}>
      <h3 className="settings-card__h3-with-icon">
        <FaGlobe className="icon" aria-hidden />
        <span>VPN connections</span>
      </h3>
      <p className="settings-item-description">
        Approximate client locations (geo-IP) and concurrent sessions for OpenVPN external ID{" "}
        <code>{ext}</code>, across all servers in the selected range.
      </p>

      <div style={{ marginBottom: 16 }}>
        <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <GeoMap from={from} to={to} vpnServerId={null} externalId={ext} />
      </div>

      <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0, marginBottom: 8 }}>
        <FaChartLine className="icon" aria-hidden />
        Session activity
      </h4>
      <p className="settings-item-description" style={{ marginTop: 0 }}>
        Concurrent sessions over time from overview statistics (not raw connection logs).
      </p>

      {errMsg && (
        <p className="error-message" style={{ marginBottom: 8 }}>
          {errMsg}
        </p>
      )}

      {!errMsg && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>
          {loading && !seriesPayload
            ? "Loading session activity…"
            : hasAnyActivity
              ? [
                  activitySummary.peakSessions != null
                    ? `Peak concurrent sessions: ${activitySummary.peakSessions}${
                        activitySummary.peakAt
                          ? ` (${formatLabel(new Date(activitySummary.peakAt), seriesMode)})`
                          : ""
                      }`
                    : null,
                  `Active periods: ${activitySummary.activePeriods}`,
                  activitySummary.lastActiveTs
                    ? `Last active: ${formatLabel(new Date(activitySummary.lastActiveTs), seriesMode)} (${activitySummary.lastActiveSessions} session${activitySummary.lastActiveSessions === 1 ? "" : "s"})`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No session activity in this range."}
        </p>
      )}

      {(hasAnyActivity || loading) && !errMsg && (
        <div
          className="user-vpn-sessions-chart"
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            background: "var(--bg-body)",
            padding: 12,
            minWidth: 0,
          }}
        >
          <div style={{ width: "100%", height: CHART_PX, minWidth: 0, minHeight: CHART_PX }}>
            {chartPoints.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_PX}>
                <AreaChart data={chartPoints} margin={{ top: 10, right: 12, left: 0, bottom: 28 }}>
                  <defs>
                    <linearGradient id="userVpnFillSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#58a6ff" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    stroke="#8b949e"
                    tick={{ fill: "#8b949e", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#8b949e"
                    tick={{ fill: "#8b949e", fontSize: 12 }}
                    allowDecimals={false}
                    width={40}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="activeSessions"
                    name="Sessions"
                    stroke="#58a6ff"
                    fill="url(#userVpnFillSessions)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                {loading ? "Loading…" : "No session activity in this range."}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
