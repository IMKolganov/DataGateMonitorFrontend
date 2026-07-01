import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaGlobe, FaSync } from "react-icons/fa";
import { keepPreviousData } from "@tanstack/react-query";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import DateRangeFilter, { type DateRangeChange, type Grouping } from "../DateRangeFilter";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import type { VpnDnsQueryLogDto, VpnDnsQueryPageResponse, VpnDnsProfileSummaryItem } from "../../api/orvalModelShim";
import {
  useGetApiVpnDnsQueriesProfileSummary,
  useGetApiVpnDnsQueriesSearch,
} from "../../api/orval/vpn-dns-query/vpn-dns-query";
import { unwrapMaybeApiResponse } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { formatDateWithOffset } from "../../utils/utils";
import { shortOpenVpnCn } from "../../utils/openVpn/shortOpenVpnCn";
import { addDays, endOfToday, startOfToday } from "../../pages/ServersOverview/helpers";
import "../../css/ServerForm.css";
import "../../css/Settings.css";
import "../../css/Table.css";

export type UserDnsQueriesSectionProps = {
  externalId: string | null | undefined;
  vpnServerId?: number | null;
  title?: string;
  compact?: boolean;
  selectedCn?: string | null;
  onSelectedCnChange?: (cn: string | null) => void;
  hideProfilePicker?: boolean;
};

export function UserDnsQueriesSection({
  externalId,
  vpnServerId,
  title = "Pi-hole DNS history",
  compact: _compact = false,
  selectedCn: selectedCnProp,
  onSelectedCnChange,
  hideProfilePicker = false,
}: UserDnsQueriesSectionProps) {
  const admin = isAdmin(getCurrentUser());
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const hasIdentity = ext.length > 0;
  const [from, setFrom] = useState(() => addDays(startOfToday(), -6));
  const [to, setTo] = useState(() => endOfToday());
  const [grouping, setGrouping] = useState<Grouping>("auto");
  const [domainFilter, setDomainFilter] = useState("");
  const [internalCn, setInternalCn] = useState<string | null>(null);
  const selectedCn = selectedCnProp !== undefined ? selectedCnProp : internalCn;
  const setSelectedCn = onSelectedCnChange ?? setInternalCn;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("user-dns-queries", 25, "10,25,50,100");

  useEffect(() => {
    setPage(0);
  }, [selectedCn]);

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
    setPage(0);
  };

  const summaryParams = useMemo(
    () => ({
      externalId: ext,
      vpnServerId: vpnServerId ?? 0,
      fromUtc: from.toISOString(),
      toUtc: to.toISOString(),
    }),
    [ext, vpnServerId, from, to],
  );

  const searchParams = useMemo(
    () => ({
      VpnServerId: vpnServerId ?? 0,
      ExternalId: selectedCn ? undefined : ext,
      CommonName: selectedCn ?? undefined,
      matchUserProfiles: !selectedCn,
      DomainContains: domainFilter.trim() || undefined,
      FromUtc: from.toISOString(),
      ToUtc: to.toISOString(),
      Page: page + 1,
      PageSize: pageSize,
    }),
    [vpnServerId, ext, selectedCn, domainFilter, from, to, page, pageSize],
  );

  const summaryQuery = useGetApiVpnDnsQueriesProfileSummary(summaryParams, {
    query: { enabled: admin && hasIdentity },
  });

  const query = useGetApiVpnDnsQueriesSearch(searchParams, {
    query: { enabled: admin && hasIdentity, placeholderData: keepPreviousData },
  });

  const profileRows = useMemo(() => {
    const raw = summaryQuery.data;
    if (Array.isArray(raw)) return raw as VpnDnsProfileSummaryItem[];
    const unwrapped = unwrapMaybeApiResponse<VpnDnsProfileSummaryItem[]>(raw as never);
    return Array.isArray(unwrapped) ? unwrapped : [];
  }, [summaryQuery.data]);

  const columns = useMemo<GridColDef<VpnDnsQueryLogDto>[]>(
    () => [
      {
        field: "queriedAtUtc",
        headerName: "Time (UTC)",
        flex: 1,
        minWidth: 170,
        valueFormatter: (v) => (v ? formatDateWithOffset(new Date(String(v))) : ""),
      },
      { field: "domain", headerName: "Domain", flex: 1.4, minWidth: 180 },
      { field: "status", headerName: "Status", width: 120 },
      { field: "clientIp", headerName: "Client IP", width: 130 },
      { field: "commonName", headerName: "CN", flex: 1, minWidth: 120 },
      { field: "queryType", headerName: "Type", width: 80 },
    ],
    [],
  );

  if (!admin) {
    return null;
  }

  if (!hasIdentity) {
    return (
      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">
          <FaGlobe className="icon" aria-hidden /> {title}
        </h3>
        <p className="server-details__intro">No VPN identity (externalId) for this user.</p>
      </section>
    );
  }

  const rows = (query.data as VpnDnsQueryPageResponse | undefined)?.items ?? [];
  const total = (query.data as VpnDnsQueryPageResponse | undefined)?.totalCount ?? 0;
  const totalProfiles = profileRows.length;
  const profilesWithDns = profileRows.filter((p) => (p.queryCount ?? 0) > 0).length;

  return (
    <section className="settings-card settings-card--mb settings-card--mt">
      <div className="settings-card__header">
        <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 0 }}>
          <FaGlobe className="icon" aria-hidden /> {title}
        </h3>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            void summaryQuery.refetch();
            void query.refetch();
          }}
          disabled={query.isFetching || summaryQuery.isFetching}
        >
          <FaSync className={`icon ${query.isFetching || summaryQuery.isFetching ? "icon-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="server-details__intro" style={{ marginTop: 0, marginBottom: 12 }}>
        {totalProfiles === 0
          ? "No issued OpenVPN profiles for this user."
          : `${profilesWithDns} of ${totalProfiles} profile(s) have Pi-hole DNS queries in the selected period.`}
      </p>

      {profileRows.length > 0 && !hideProfilePicker && (
        <div className="server-form" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label>OpenVPN profile (CN)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                className={`btn ${selectedCn ? "secondary" : "primary"}`}
                onClick={() => {
                  setSelectedCn(null);
                  setPage(0);
                }}
              >
                All profiles ({profileRows.reduce((sum, p) => sum + (p.queryCount ?? 0), 0)})
              </button>
              {profileRows.map((profile) => {
                const cn = profile.commonName?.trim() ?? "";
                if (!cn) return null;
                const active = selectedCn === cn;
                const count = profile.queryCount ?? 0;
                return (
                  <button
                    key={`${profile.vpnServerId ?? 0}|${cn}`}
                    type="button"
                    className={`btn ${active ? "primary" : "secondary"}`}
                    title={cn}
                    onClick={() => {
                      setSelectedCn(cn);
                      setPage(0);
                    }}
                  >
                    srv {profile.vpnServerId ?? "?"} · {shortOpenVpnCn(cn)} ({count})
                    {profile.isRevoked ? " · revoked" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      <div className="server-form">
        <div className="form-group">
          <label htmlFor="user-dns-domain-filter">Domain contains</label>
          <input
            id="user-dns-domain-filter"
            type="text"
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setPage(0);
            }}
            placeholder="e.g. netflix"
          />
        </div>
      </div>

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{
            backgroundColor: "var(--bg-body)",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <Grid
            gridId="user-dns-queries"
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id ?? 0}
            loading={query.isLoading || query.isFetching}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(m) => {
              setPage(m.page);
              setPageSize(m.pageSize);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{
              noRowsLabel:
                profileRows.length > 0 && profilesWithDns === 0
                  ? "📭 No DNS via Pi-hole for these profiles (client may bypass VPN DNS)"
                  : "📭 No DNS queries logged",
            }}
          />
        </div>
      </CustomThemeProvider>
    </section>
  );
}
