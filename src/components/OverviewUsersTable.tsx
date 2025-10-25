import React, { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Link, useParams } from "react-router-dom";
import StyledDataGrid from "./TableStyle";
import CustomThemeProvider from "./ThemeProvider";
import type { OverviewUserItem } from "../utils/types";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import { fetchOverviewUsers } from "../utils/api/OpenVpnServerClients";

type OverviewUserRow = {
  id: string;
  externalId: string;
  vpnServerId: number | null;
  sessions: number;
  trafficIn: string;
  trafficOut: string;
  trafficTotal: string;
  firstSeen: string;
  lastSeen: string;
};

export interface OverviewUsersTableProps {
  from: Date;
  to: Date;
  vpnServerId?: number | null;
  externalId?: string | null;
}

export const OverviewUsersTable: React.FC<OverviewUsersTableProps> = ({
  from,
  to,
  vpnServerId,
  externalId,
}) => {
  const [users, setUsers] = useState<OverviewUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { vpnServerId: vpnServerIdFromRoute } = useParams<{ vpnServerId: string }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOverviewUsers({
          from,
          to,
          vpnServerId: vpnServerId ?? undefined,
          externalId: externalId?.trim() || undefined,
        });
        if (!cancelled) setUsers(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to, vpnServerId, externalId]);

  const rows = useMemo(() => {
    return users.map((u, index) => {
      const firstSeen = u.firstSeen ? formatDateWithOffset(new Date(u.firstSeen)) : "";
      const lastSeen  = u.lastSeen  ? formatDateWithOffset(new Date(u.lastSeen))  : "";
      return {
        id: `${u.externalId ?? "unknown"}_${u.vpnServerId ?? "mixed"}_${index}`,
        externalId: u.externalId ?? "",
        vpnServerId: u.vpnServerId ?? null,
        sessions: u.sessions,
        trafficIn: formatBytes(u.trafficInBytes),
        trafficOut: formatBytes(u.trafficOutBytes),
        trafficTotal: formatBytes(u.trafficTotalBytes),
        firstSeen,
        lastSeen,
      };
    });
  }, [users]);

  const columns: GridColDef[] = [
    {
      field: "externalId",
      headerName: "External Id",
      flex: 0.9,
      renderCell: (params) => {
        const extId = params.value as string;
        if (!extId) return null;

        const rowServerId = (params.row?.vpnServerId as number | null) ?? null;
        const routeServerId = vpnServerIdFromRoute ? Number(vpnServerIdFromRoute) : null;
        const serverIdForLink = rowServerId ?? routeServerId;

        const url = serverIdForLink
          ? `/servers/${serverIdForLink}/statistics/${extId}`
          : `/servers/statistics/${extId}`;

        return (
          <Link to={url} style={{ color: "#58a6ff", textDecoration: "none" }}>
            {extId}
          </Link>
        );
      },
    },
    {
      field: "vpnServerId",
      headerName: "Server",
      flex: 0.5,
      renderCell: (params) => (params.value == null ? "mixed" : String(params.value)),
    },
    { field: "sessions", headerName: "Sessions", flex: 0.45 },
    { field: "trafficIn", headerName: "Traffic In", flex: 0.6 },
    { field: "trafficOut", headerName: "Traffic Out", flex: 0.6 },
    { field: "trafficTotal", headerName: "Total Traffic", flex: 0.6 },
    { field: "firstSeen", headerName: "First Seen", flex: 0.7 },
    { field: "lastSeen", headerName: "Last Seen", flex: 0.7 },
  ];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <h3>Users in Selection</h3>
      <CustomThemeProvider>
        <div
          style={{
            width: "100%",
            minWidth: 0,
            backgroundColor: "#0d1117",
            padding: "10px",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
            <StyledDataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            paginationMode="client"
            loading={loading}
            disableColumnFilter
            disableColumnMenu
            localeText={{
                noRowsLabel: error ? `❗ ${error}` : "📭 No users in selection",
            }}
            />
        </div>
      </CustomThemeProvider>
    </div>
  );
};
