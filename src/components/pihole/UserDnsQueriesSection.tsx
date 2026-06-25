import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaGlobe, FaSync } from "react-icons/fa";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import DateRangeFilter, { type DateRangeChange, type Grouping } from "../DateRangeFilter";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import {
  getApiVpnDnsQueriesSearch,
  getGetApiVpnDnsQueriesSearchQueryKey,
} from "../../api/orval/vpn-dns-query/vpn-dns-query";
import type { VpnDnsQueryLogDto, VpnDnsQueryPageResponse } from "../../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { formatDateWithOffset } from "../../utils/utils";
import { addDays, endOfToday, startOfToday } from "../../pages/ServersOverview/helpers";
import "../../css/ServerForm.css";
import "../../css/Settings.css";
import "../../css/Table.css";

export type UserDnsQueriesSectionProps = {
  externalId: string | null | undefined;
  vpnServerId?: number | null;
  title?: string;
  compact?: boolean;
};

export function UserDnsQueriesSection({
  externalId,
  vpnServerId,
  title = "Pi-hole DNS history",
  compact: _compact = false,
}: UserDnsQueriesSectionProps) {
  const admin = isAdmin(getCurrentUser());
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const hasIdentity = ext.length > 0;
  const [from, setFrom] = useState(() => addDays(startOfToday(), -6));
  const [to, setTo] = useState(() => endOfToday());
  const [grouping, setGrouping] = useState<Grouping>("auto");
  const [domainFilter, setDomainFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("user-dns-queries", 25, "10,25,50,100");

  const onFilterChange = (c: DateRangeChange) => {
    setFrom(c.from);
    setTo(c.to);
    setGrouping(c.grouping);
    setPage(0);
  };

  const searchParams = useMemo(
    () => ({
      VpnServerId: vpnServerId ?? 0,
      ExternalId: ext,
      DomainContains: domainFilter.trim() || undefined,
      FromUtc: from.toISOString(),
      ToUtc: to.toISOString(),
      Page: page + 1,
      PageSize: pageSize,
    }),
    [vpnServerId, ext, domainFilter, from, to, page, pageSize],
  );

  const query = useQuery({
    queryKey: getGetApiVpnDnsQueriesSearchQueryKey(searchParams),
    enabled: admin && hasIdentity,
    placeholderData: keepPreviousData,
    queryFn: () => getApiVpnDnsQueriesSearch(searchParams),
  });

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

  return (
    <section className="settings-card settings-card--mb">
      <h3 className="settings-card__h3-with-icon">
        <FaGlobe className="icon" aria-hidden /> {title}
      </h3>
      <div className="header-bar">
        <div className="left-buttons">
          <button type="button" className="btn secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <FaSync className={`icon ${query.isFetching ? "icon-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

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
          <StyledDataGrid
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
            localeText={{ noRowsLabel: "📭 No DNS queries logged" }}
          />
        </div>
      </CustomThemeProvider>
    </section>
  );
}
