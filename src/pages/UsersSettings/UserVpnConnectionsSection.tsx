import { useMemo, useState } from "react";
import { FaGlobe, FaTable } from "react-icons/fa";
import DateRangeFilter, { type DateRangeChange, type Grouping } from "../../components/DateRangeFilter";
import StyledDataGrid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import type { GridColDef } from "@mui/x-data-grid";
import { keepPreviousData } from "@tanstack/react-query";
import { useGetApiOpenVpnClientsOverviewUsersSeries } from "../../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import { OverviewGrouping } from "../../api/orval/model";
import type {
  GetApiOpenVpnClientsOverviewUsersSeriesParams,
  OverviewUsersSeriesResponse,
} from "../../api/orval/model";
import type { OverviewUsersSeriesResponseApiResponse } from "../../api/orval/model";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { isCanceledError } from "../../utils/queryCanceled";
import GeoMap from "../ServersOverview/GeoMap";
import { addDays, endOfToday, startOfToday } from "../ServersOverview/helpers";

const UI_TO_API_GROUPING: Record<
  Grouping,
  (typeof OverviewGrouping)[keyof typeof OverviewGrouping]
> = {
  auto: OverviewGrouping.NUMBER_0,
  hours: OverviewGrouping.NUMBER_1,
  days: OverviewGrouping.NUMBER_2,
  months: OverviewGrouping.NUMBER_3,
  years: OverviewGrouping.NUMBER_4,
};

function toApiGrouping(g: Grouping) {
  return UI_TO_API_GROUPING[g];
}

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

  const gridRows = useMemo(() => {
    const rows = seriesPayload?.rows ?? [];
    const sorted = [...rows].sort((a, b) => {
      const ta = a.ts ? new Date(a.ts).getTime() : 0;
      const tb = b.ts ? new Date(b.ts).getTime() : 0;
      return tb - ta;
    });
    return sorted.map((r, idx) => ({
      id: idx,
      period:
        r.ts && !Number.isNaN(new Date(r.ts).getTime())
          ? new Date(r.ts).toLocaleString()
          : "—",
      activeSessions: r.activeSessions ?? 0,
      activeUsers: r.activeUsers ?? 0,
    }));
  }, [seriesPayload?.rows]);

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
        Approximate client locations (geo-IP) and aggregated session counts for OpenVPN external ID{" "}
        <code>{ext}</code>, across all servers in the selected range.
      </p>

      <div style={{ marginBottom: 16 }}>
        <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <GeoMap from={from} to={to} vpnServerId={null} externalId={ext} />
      </div>

      <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
        <FaTable className="icon" />
        Session activity by period
      </h4>
      <p className="settings-item-description" style={{ marginTop: 0 }}>
        Buckets follow the date range grouping (e.g. hours vs days). Values come from overview statistics, not raw
        connection logs.
      </p>
      {errMsg && (
        <p className="error-message" style={{ marginBottom: 8 }}>
          {errMsg}
        </p>
      )}
      {seriesPayload?.summary != null && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>
          Peak in range: sessions {seriesPayload.summary.peakActiveSessions ?? "—"}, concurrent users{" "}
          {seriesPayload.summary.peakActiveUsers ?? "—"}
        </p>
      )}
      <div
        className="data-grid-wrap"
        style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
      >
        <CustomThemeProvider>
          <StyledDataGrid
            rows={gridRows}
            columns={
              [
                { field: "period", headerName: "Period", flex: 1.2, minWidth: 160 },
                { field: "activeSessions", headerName: "Sessions (bucket)", type: "number", width: 150 },
                { field: "activeUsers", headerName: "Active users (bucket)", type: "number", width: 180 },
              ] as GridColDef[]
            }
            pagination
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            loading={usersSeriesQuery.isLoading || usersSeriesQuery.isFetching}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "No data in this range" }}
            disableRowSelectionOnClick
          />
        </CustomThemeProvider>
      </div>
    </section>
  );
}
