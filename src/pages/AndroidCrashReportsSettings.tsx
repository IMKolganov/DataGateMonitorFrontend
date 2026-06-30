import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { GridColDef } from "@mui/x-data-grid";
import { FaBug, FaSync } from "react-icons/fa";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { getApiBaseUrlResolved } from "../api/apirequest";
import { ACCESS_TOKEN_KEY } from "../utils/const";
import { errorMessage } from "../utils/errorMessage";
import "../css/Settings.css";
import "../css/Table.css";

type RecentCrashReportDto = {
  id: number;
  receivedAt: string;
  appProcess: string;
  fileName: string;
  parseStatus: string;
  timestampUtc?: string | null;
  process?: string | null;
  thread?: string | null;
  sdk?: string | null;
  device?: string | null;
  kind?: string | null;
  exception?: string | null;
  message?: string | null;
  tag?: string | null;
  stacktrace?: string | null;
  payloadRaw?: string | null;
};

const DEFAULT_LIMIT = 100;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;

async function getRecentCrashes(limit: number): Promise<RecentCrashReportDto[]> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error("Access token is missing.");
  const base = await getApiBaseUrlResolved();
  const url = `${base}/api/v1/mobile/crash-ingest/recent?limit=${encodeURIComponent(String(limit))}`;
  const response = await axios.get<RecentCrashReportDto[]>(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export default function AndroidCrashReportsSettings() {
  const [limitInput, setLimitInput] = useState<string>(String(DEFAULT_LIMIT));
  const [appliedLimit, setAppliedLimit] = useState<number>(DEFAULT_LIMIT);
  const [processFilter, setProcessFilter] = useState<string>("");
  const [selectedCrash, setSelectedCrash] = useState<RecentCrashReportDto | null>(null);

  const crashesQuery = useQuery({
    queryKey: ["android-crash-reports", appliedLimit],
    queryFn: () => getRecentCrashes(appliedLimit),
    staleTime: 10_000,
  });

  const filteredRows = useMemo(() => {
    const rows = crashesQuery.data ?? [];
    const filter = processFilter.trim().toLowerCase();
    if (!filter) return rows;
    return rows.filter((r) => (r.appProcess ?? "").toLowerCase().includes(filter));
  }, [crashesQuery.data, processFilter]);

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 90 },
    {
      field: "receivedAt",
      headerName: "Received",
      width: 180,
      valueFormatter: (value) => (value ? new Date(String(value)).toLocaleString() : "—"),
    },
    { field: "appProcess", headerName: "App process", flex: 0.35, minWidth: 180 },
    { field: "fileName", headerName: "File", flex: 0.25, minWidth: 150 },
    { field: "parseStatus", headerName: "Parse", width: 110 },
    {
      field: "thread",
      headerName: "Thread",
      width: 160,
      valueGetter: (_value, row: RecentCrashReportDto) => row.thread ?? "",
    },
    {
      field: "device",
      headerName: "Device",
      flex: 0.3,
      minWidth: 170,
      valueGetter: (_value, row: RecentCrashReportDto) => row.device ?? "",
    },
    {
      field: "sdk",
      headerName: "SDK",
      width: 90,
      valueGetter: (_value, row: RecentCrashReportDto) => row.sdk ?? "",
    },
    {
      field: "kind",
      headerName: "Kind",
      width: 110,
      valueGetter: (_value, row: RecentCrashReportDto) => row.kind ?? "",
    },
    {
      field: "tag",
      headerName: "Tag",
      flex: 0.25,
      minWidth: 140,
      valueGetter: (_value, row: RecentCrashReportDto) => row.tag ?? "",
    },
    { field: "exception", headerName: "Exception", flex: 0.35, minWidth: 180 },
    {
      field: "message",
      headerName: "Message",
      flex: 0.5,
      minWidth: 220,
      valueGetter: (_value, row: RecentCrashReportDto) => row.message ?? "",
    },
    {
      field: "stacktrace",
      headerName: "Stacktrace",
      flex: 0.6,
      minWidth: 260,
      valueGetter: (_value, row: RecentCrashReportDto) => row.stacktrace ?? "",
      renderCell: (params) => {
        const value = String(params.value ?? "");
        if (!value) return "—";
        const preview = value.length > 140 ? `${value.slice(0, 140)}...` : value;
        return <span title={value}>{preview}</span>;
      },
    },
    {
      field: "payloadRaw",
      headerName: "Raw payload",
      flex: 0.6,
      minWidth: 260,
      valueGetter: (_value, row: RecentCrashReportDto) => row.payloadRaw ?? "",
      renderCell: (params) => {
        const value = String(params.value ?? "");
        if (!value) return "—";
        const preview = value.length > 140 ? `${value.slice(0, 140)}...` : value;
        return <span title={value}>{preview}</span>;
      },
    },
    {
      field: "actions",
      headerName: "Details",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <button
          type="button"
          className="btn secondary"
          onClick={() => setSelectedCrash(params.row as RecentCrashReportDto)}
        >
          View
        </button>
      ),
    },
  ];

  const applyLimit = () => {
    const parsed = Number(limitInput);
    if (!Number.isFinite(parsed)) return;
    const bounded = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.trunc(parsed)));
    setAppliedLimit(bounded);
    setLimitInput(String(bounded));
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaBug className="icon" aria-hidden />
        <span>Android crash reports</span>
      </h2>

      <p className="settings-item-description" style={{ marginBottom: 14, maxWidth: 980 }}>
        Shows recent mobile crash reports from `api/v1/mobile/crash-ingest/recent`. Data is already redacted by backend.
      </p>

      <div className="settings-item" style={{ marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <label htmlFor="android-crash-limit">Limit</label>
        <input
          id="android-crash-limit"
          type="number"
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          className="input"
          style={{ width: 120 }}
          value={limitInput}
          onChange={(e) => setLimitInput(e.target.value)}
        />
        <button type="button" className="btn secondary" onClick={applyLimit}>
          Apply
        </button>

        <label htmlFor="android-crash-process-filter" style={{ marginLeft: 8 }}>
          Filter by process
        </label>
        <input
          id="android-crash-process-filter"
          type="text"
          className="input"
          style={{ minWidth: 260 }}
          placeholder="com.imkolganov.datagate"
          value={processFilter}
          onChange={(e) => setProcessFilter(e.target.value)}
        />

        <button type="button" className="btn secondary" onClick={() => void crashesQuery.refetch()}>
          <FaSync className={`icon ${crashesQuery.isFetching ? "icon-spin" : ""}`} aria-hidden /> Refresh
        </button>
      </div>

      {crashesQuery.error && (
        <p className="error-message" style={{ marginBottom: 14 }}>
          Failed to load crash reports: {errorMessage(crashesQuery.error)}
        </p>
      )}

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
        >
          <Grid
            gridId="android-crash-reports"
            rows={filteredRows}
            columns={columns}
            getRowId={(r) => (r as RecentCrashReportDto).id}
            loading={crashesQuery.isLoading || crashesQuery.isFetching}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50, 100]}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "No crash reports found." }}
          />
        </div>
      </CustomThemeProvider>

      {selectedCrash && (
        <div className="modal-overlay" onClick={() => setSelectedCrash(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 980, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Crash #{selectedCrash.id}</h3>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setSelectedCrash(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0 20px 16px" }}>
              <dl className="user-detail-dl">
                <dt>Received</dt>
                <dd>{selectedCrash.receivedAt ? new Date(selectedCrash.receivedAt).toLocaleString() : "—"}</dd>
                <dt>App process</dt>
                <dd>{selectedCrash.appProcess || "—"}</dd>
                <dt>File</dt>
                <dd>{selectedCrash.fileName || "—"}</dd>
                <dt>Parse status</dt>
                <dd>{selectedCrash.parseStatus || "—"}</dd>
                <dt>Exception</dt>
                <dd>{selectedCrash.exception || "—"}</dd>
                <dt>Message</dt>
                <dd>{selectedCrash.message || "—"}</dd>
                <dt>Thread</dt>
                <dd>{selectedCrash.thread || "—"}</dd>
                <dt>Device</dt>
                <dd>{selectedCrash.device || "—"}</dd>
                <dt>SDK</dt>
                <dd>{selectedCrash.sdk || "—"}</dd>
                <dt>Kind</dt>
                <dd>{selectedCrash.kind || "—"}</dd>
                <dt>Tag</dt>
                <dd>{selectedCrash.tag || "—"}</dd>
              </dl>

              <h4 style={{ marginTop: 14, marginBottom: 8 }}>Stacktrace</h4>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 300,
                  overflow: "auto",
                  background: "var(--bg-body)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                {selectedCrash.stacktrace || "—"}
              </pre>

              <h4 style={{ marginTop: 14, marginBottom: 8 }}>Raw payload</h4>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 300,
                  overflow: "auto",
                  background: "var(--bg-body)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                {selectedCrash.payloadRaw || "—"}
              </pre>
            </div>

            <div className="modal-actions" style={{ padding: "0 20px 20px" }}>
              <button type="button" className="btn secondary" onClick={() => setSelectedCrash(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
