// Events.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import type { GridColDef } from "@mui/x-data-grid";
import { FaSync } from "react-icons/fa";
import { fetchEvents } from "../utils/api/OpenVpnServerEvent";
import { formatDateWithOffset } from "../utils/utils";

interface VpnEvent {
  id: number;
  vpnServerId: number;
  eventType: string;
  commonName: string | null;
  realAddress: string | null;
  virtualAddress: string | null;
  connectedSince: string | null;
  scriptType: string | null;
  action: string | null;
  eventTimeUtc: string | null;
  bytesReceived: number | null;
  bytesSent: number | null;
  durationSec: number | null;
  disconnectedAt: string | null;
  ivVer: string | null;
  ivGuiVer: string | null;
  ivPlat: string | null;
  message: string | null;
  createDate: string | null;
  lastUpdate: string | null;
}

// Safe date formatter
const safeFormatDate = (value: unknown) => {
  if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

// Simple byte formatting
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

// Duration (seconds) to hh:mm:ss
const formatDuration = (s?: number | null) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

// Normalize various possible server shapes to a stable structure
function normalizeEventsResponse(raw: any): {
  items: VpnEvent[];
  totalCount: number;
  page?: number;
  pageSize?: number;
} {
  // ApiResponse<T> support
  const data = raw?.data ?? raw ?? {};
  // Our API puts paged data under "events"
  const paged = data?.events ?? data;

  // Primary: paged.items
  let items: unknown = paged?.items;
  // Fallbacks if backend returns array directly
  if (!Array.isArray(items)) {
    if (Array.isArray(data?.events)) items = data.events;
    else if (Array.isArray(paged)) items = paged;
    else if (Array.isArray(raw)) items = raw;
    else items = [];
  }

  const totalCountRaw =
    typeof paged?.totalCount === "number"
      ? paged.totalCount
      : Array.isArray(items)
      ? (items as any[]).length
      : 0;

  return {
    items: (items as any[]).map((e, idx) => ({
      id: Number(e?.id ?? idx + 1),
      vpnServerId: Number(e?.vpnServerId ?? 0),
      eventType: String(e?.eventType ?? ""),
      commonName: e?.commonName ?? null,
      realAddress: e?.realAddress ?? null,
      virtualAddress: e?.virtualAddress ?? null,
      connectedSince: e?.connectedSince ?? null,
      scriptType: e?.scriptType ?? null,
      action: e?.action ?? null,
      eventTimeUtc: e?.eventTimeUtc ?? null,
      bytesReceived: typeof e?.bytesReceived === "number" ? e.bytesReceived : null,
      bytesSent: typeof e?.bytesSent === "number" ? e.bytesSent : null,
      durationSec: typeof e?.durationSec === "number" ? e.durationSec : null,
      disconnectedAt: e?.disconnectedAt ?? null,
      ivVer: e?.ivVer ?? null,
      ivGuiVer: e?.ivGuiVer ?? null,
      ivPlat: e?.ivPlat ?? null,
      message: e?.message ?? null,
      createDate: e?.createDate ?? null,
      lastUpdate: e?.lastUpdate ?? null,
    })),
    totalCount: Number.isFinite(totalCountRaw) ? Number(totalCountRaw) : 0,
    page: typeof paged?.page === "number" ? paged.page : undefined,
    pageSize: typeof paged?.pageSize === "number" ? paged.pageSize : undefined,
  };
}

const Events: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [events, setEvents] = useState<VpnEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0); // DataGrid is 0-based
  const [pageSize, setPageSize] = useState(10);
  const [totalEvents, setTotalEvents] = useState(0);

  const loadEvents = async () => {
    if (!vpnServerId) return;
    setLoading(true);
    try {
      // Backend expects 1-based page index
      const raw = await fetchEvents(vpnServerId, page + 1, pageSize);
      const normalized = normalizeEventsResponse(raw);

      setEvents(normalized.items);
      setTotalEvents(normalized.totalCount);

      // If backend corrected page/pageSize, sync UI
      if (typeof normalized.page === "number" && normalized.page >= 1) {
        const zeroBased = normalized.page - 1;
        if (zeroBased !== page) setPage(zeroBased);
      }
      if (typeof normalized.pageSize === "number" && normalized.pageSize > 0) {
        if (normalized.pageSize !== pageSize) setPageSize(normalized.pageSize);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents([]);
      setTotalEvents(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpnServerId, page, pageSize]);

  const rows = events.map((event, index) => ({
    id: event.id ?? index + 1,
    eventType: event.eventType ?? "",
    commonName: event.commonName ?? "",
    realAddress: event.realAddress ?? "",
    virtualAddress: event.virtualAddress ?? "",
    connectedSince: safeFormatDate(event.connectedSince),
    eventTimeUtc: safeFormatDate(event.eventTimeUtc),
    disconnectedAt: safeFormatDate(event.disconnectedAt),
    duration: formatDuration(event.durationSec),
    bytesSent: formatBytes(event.bytesSent ?? undefined),
    bytesReceived: formatBytes(event.bytesReceived ?? undefined),
    ivVer: event.ivVer ?? "",
    ivGuiVer: event.ivGuiVer ?? "",
    ivPlat: event.ivPlat ?? "",
    createDate: safeFormatDate(event.createDate),
  }));

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
    // You can uncomment if you want these visible too:
    // { field: "ivGuiVer", headerName: "IV GUI Ver", flex: 1.2 },
    // { field: "ivPlat", headerName: "Platform", width: 120 },
    { field: "createDate", headerName: "Create Date", flex: 1 },
  ];

  return (
    <CustomThemeProvider>
      <div>
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={loadEvents} disabled={loading}>
              {FaSync({ className: `icon ${loading ? "icon-spin" : ""}` })} Refresh
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
            rowCount={totalEvents}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            loading={loading}
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
