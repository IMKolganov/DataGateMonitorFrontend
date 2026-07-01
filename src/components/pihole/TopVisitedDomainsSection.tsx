import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaGlobe, FaSync } from "react-icons/fa";
import { keepPreviousData } from "@tanstack/react-query";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { useGetApiVpnDnsQueriesTopDomains } from "../../api/orval/vpn-dns-query/vpn-dns-query";
import type { VpnDnsTopDomainDto, VpnDnsTopDomainsResponse } from "../../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import "../../css/Settings.css";
import "../../css/Table.css";

export type TopVisitedDomainsSectionProps = {
  from: Date;
  to: Date;
};

type TopDomainRow = VpnDnsTopDomainDto & { id: number };

export function TopVisitedDomainsSection({ from, to }: TopVisitedDomainsSectionProps) {
  const admin = isAdmin(getCurrentUser());

  const params = useMemo(
    () => ({
      FromUtc: from.toISOString(),
      ToUtc: to.toISOString(),
      Limit: 100,
    }),
    [from, to],
  );

  const query = useGetApiVpnDnsQueriesTopDomains(params, {
    query: {
      enabled: admin,
      placeholderData: keepPreviousData,
    },
  });

  const rows = useMemo<TopDomainRow[]>(() => {
    const items = (query.data as VpnDnsTopDomainsResponse | undefined)?.items ?? [];
    return items.map((row, index) => ({ ...row, id: index + 1 }));
  }, [query.data]);

  const columns = useMemo<GridColDef<TopDomainRow>[]>(
    () => [
      { field: "id", headerName: "#", width: 64, sortable: false },
      { field: "domain", headerName: "Domain", flex: 1.6, minWidth: 220 },
      {
        field: "uniqueUsersCount",
        headerName: "Users",
        type: "number",
        width: 110,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "queryCount",
        headerName: "Queries",
        type: "number",
        width: 110,
        headerAlign: "right",
        align: "right",
      },
    ],
    [],
  );

  if (!admin) {
    return null;
  }

  return (
    <section className="settings-card settings-card--mb">
      <h3 className="settings-card__h3-with-icon">
        <FaGlobe className="icon" aria-hidden /> Top 100 visited domains
      </h3>
      <p className="server-details__intro" style={{ marginTop: 0 }}>
        Domains ranked by unique VPN users for the selected date range.
      </p>
      <div className="header-bar">
        <div className="left-buttons">
          <button type="button" className="btn secondary" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <FaSync className={`icon ${query.isFetching ? "icon-spin" : ""}`} />
            Refresh
          </button>
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
            gridId="top-visited-domains"
            rows={rows}
            columns={columns}
            loading={query.isLoading || query.isFetching}
            disableRowSelectionOnClick
            hideFooter
            autoHeight
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "📭 No DNS data for this period" }}
          />
        </div>
      </CustomThemeProvider>
    </section>
  );
}
