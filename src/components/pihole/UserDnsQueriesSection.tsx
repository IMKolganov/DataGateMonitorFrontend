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
import { formatDateWithOffset } from "../../utils/utils";
import { addDays, endOfToday, startOfToday } from "../../pages/ServersOverview/helpers";
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
  compact = false,
}: UserDnsQueriesSectionProps) {
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
    enabled: hasIdentity,
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

  if (!hasIdentity) {
    return (
      <section className="settings-section">
        <h3><FaGlobe /> {title}</h3>
        <p className="muted">No VPN identity (externalId) for this user.</p>
      </section>
    );
  }

  const rows = (query.data as VpnDnsQueryPageResponse | undefined)?.items ?? [];
  const total = (query.data as VpnDnsQueryPageResponse | undefined)?.totalCount ?? 0;

  return (
    <section className={`settings-section${compact ? " settings-section--compact" : ""}`}>
      <div className="settings-section__header">
        <h3><FaGlobe /> {title}</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <FaSync /> Refresh
        </button>
      </div>

      <DateRangeFilter from={from} to={to} grouping={grouping} onChange={onFilterChange} />
      <div className="form-row" style={{ marginTop: 8, marginBottom: 8 }}>
        <label>
          Domain contains
          <input
            type="text"
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setPage(0);
            }}
            placeholder="e.g. netflix"
          />
        </label>
      </div>

      <CustomThemeProvider>
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
          autoHeight
          disableRowSelectionOnClick
        />
      </CustomThemeProvider>
    </section>
  );
}
