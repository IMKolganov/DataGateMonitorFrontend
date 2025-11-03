// src/pages/Events.tsx
// comments in English only
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import type { GridColDef } from "@mui/x-data-grid";
import { FaSync } from "react-icons/fa";
import { formatDateWithOffset } from "../utils/utils";
import {
  useGetApiOpenVpnEventsGetByServer,
  getApiOpenVpnEventsGetByServer,
} from "../api/orval/open-vpn-server-event/open-vpn-server-event";

// --- Type helpers derived from orval output ---
// Resp is already unwrapped by ogmMutator (ApiResponse<T> -> T)
type Resp = Awaited<ReturnType<typeof getApiOpenVpnEventsGetByServer>>;

// Try to extract item shape from several possible server response shapes
type ExtractItem<T> =
  T extends { events: { items: infer A } } ? (A extends Array<infer I> ? I : never) :
  T extends { events: infer A } ? (A extends Array<infer I> ? I : never) :
  T extends { items: infer A } ? (A extends Array<infer I> ? I : never) :
  T extends Array<infer I> ? I :
  never;

type Item = ExtractItem<Resp>;

type Normalized<TItem> = {
  items: TItem[];
  totalCount: number;
  page?: number;
  pageSize?: number;
};

// --- Safe formatters ---
const safeFormatDate = (value: unknown) => {
  if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

const formatBytes = (n?: number | null) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

const formatDuration = (s?: number | null) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

// Normalize different possible response shapes into a stable struct
function normalize<TItem = Item>(raw: Resp): Normalized<TItem> {
  // primary containers we might see
  const top: any = raw ?? {};
  const events = top.events ?? top;

  let items: any[] | undefined =
    Array.isArray(events?.items) ? events.items :
    Array.isArray(events) ? events :
    Array.isArray(top?.items) ? top.items :
    Array.isArray(top) ? top :
    [];

  const totalCount: number =
    typeof events?.totalCount === "number" ? events.totalCount :
    typeof top?.totalCount === "number" ? top.totalCount :
    items.length;

  const page: number | undefined =
    typeof events?.page === "number" ? events.page :
    typeof top?.page === "number" ? top.page :
    undefined;

  const pageSize: number | undefined =
    typeof events?.pageSize === "number" ? events.pageSize :
    typeof top?.pageSize === "number" ? top.pageSize :
    undefined;

  return { items: items as TItem[], totalCount, page, pageSize };
}

const Events: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  // Keep DataGrid model in URL-less state via React state lifted into grid (server pagination)
  const [page, setPage] = React.useState(0);       // DataGrid is 0-based
  const [pageSize, setPageSize] = React.useState(10);

  const params = useMemo(() => {
    const idNum = Number(vpnServerId || 0);
    return {
      // IMPORTANT: Orval params are PascalCase (as seen on other endpoints: From/To)
      VpnServerId: idNum,
      Page: page + 1,       // API is 1-based
      PageSize: pageSize,
    };
  }, [vpnServerId, page, pageSize]);

  const {
    data: resp,
    isFetching,
    refetch,
  } = useGetApiOpenVpnEventsGetByServer<Resp>(params, {
    query: {
      enabled: !!Number(vpnServerId),
      keepPreviousData: true,
      // Optional: staleTime: 0,
    },
  });

  const normalized = useMemo(() => (resp ? normalize<Item>(resp) : { items: [], totalCount: 0 } as Normalized<Item>), [resp]);

  // If backend returns corrected page or pageSize, sync them back to the grid
  React.useEffect(() => {
    if (!resp) return;
    const n = normalize<Item>(resp);
    if (typeof n.page === "number" && n.page >= 1) {
      const zero = n.page - 1;
      if (zero !== page) setPage(zero);
    }
    if (typeof n.pageSize === "number" && n.pageSize > 0) {
      if (n.pageSize !== pageSize) setPageSize(n.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resp]);

  const rows = useMemo(() => {
    return normalized.items.map((e: any, idx: number) => ({
      id: Number(e?.id ?? idx + 1),
      eventType: String(e?.eventType ?? ""),
      commonName: e?.commonName ?? "",
      realAddress: e?.realAddress ?? "",
      virtualAddress: e?.virtualAddress ?? "",
      connectedSince: safeFormatDate(e?.connectedSince),
      eventTimeUtc: safeFormatDate(e?.eventTimeUtc),
      disconnectedAt: safeFormatDate(e?.disconnectedAt),
      duration: formatDuration(
        typeof e?.durationSec === "number" ? e.durationSec : undefined
      ),
      bytesSent: formatBytes(
        typeof e?.bytesSent === "number" ? e.bytesSent : undefined
      ),
      bytesReceived: formatBytes(
        typeof e?.bytesReceived === "number" ? e.bytesReceived : undefined
      ),
      ivVer: e?.ivVer ?? "",
      // Uncomment if you want more columns:
      // ivGuiVer: e?.ivGuiVer ?? "",
      // ivPlat: e?.ivPlat ?? "",
      createDate: safeFormatDate(e?.createDate),
    }));
  }, [normalized.items]);

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "eventType", headerName: "Type", flex: 0.8 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "realAddress", headerName: "Real Address", flex: 0.9 },
    { field: "virtualAddress", headerName: "Virtual Address", flex: 0.8 },
    { field: "connectedSince", headerName: "Connected Since", flex: 1 },
    { field: "eventTimeUtc", headerName: "Event Time (UTC)", flex: 1 },
    { field: "disconnectedAt", headerName: "Disconnected At", flex: 1 },
    { field: "duration", headerName: "Duration", width: 120 },
    { field: "bytesSent", headerName: "Sent", width: 120 },
    { field: "bytesReceived", headerName: "Received", width: 120 },
    { field: "ivVer", headerName: "IV Ver", width: 120 },
    // { field: "ivGuiVer", headerName: "IV GUI Ver", flex: 1.2 },
    // { field: "ivPlat", headerName: "Platform", width: 120 },
    { field: "createDate", headerName: "Create Date", flex: 1 },
  ];

  return (
    <CustomThemeProvider>
      <div>
        <div className="header-bar">
          <div className="left-buttons">
            <button
              className="btn secondary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {FaSync({ className: `icon ${isFetching ? "icon-spin" : ""}` })} Refresh
            </button>
          </div>
        </div>

        <h2>Server Events:</h2>

        <div style={{ marginTop: "1rem" }}>
          <StyledDataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 20, 50]}
            paginationMode="server"
            rowCount={normalized.totalCount}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            loading={isFetching}
            disableColumnFilter
            disableColumnMenu
            localeText={{ noRowsLabel: "📭 No events logged" }}
          />
        </div>
      </div>
    </CustomThemeProvider>
  );
};

export default Events;
