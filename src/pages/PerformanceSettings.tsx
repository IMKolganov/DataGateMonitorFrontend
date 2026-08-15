import { useMemo, useState } from "react";
import { FaCopy, FaSync, FaTachometerAlt, FaTrash } from "react-icons/fa";
import type { GridColDef } from "@mui/x-data-grid";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import {
  useDeleteApiPerformance,
  useGetApiPerformanceDbQueries,
  useGetApiPerformanceHttpRequests,
} from "../api/orval/performance/performance";
import type { PerformancePerformanceDbQueriesResponse } from "../api/orval/model/performancePerformanceDbQueriesResponse";
import type { PerformancePerformanceDbQueryEntryDto } from "../api/orval/model/performancePerformanceDbQueryEntryDto";
import type { PerformancePerformanceHttpRequestEntryDto } from "../api/orval/model/performancePerformanceHttpRequestEntryDto";
import type { PerformancePerformanceHttpRequestsResponse } from "../api/orval/model/performancePerformanceHttpRequestsResponse";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { buildTopSlow, formatSqlForDisplay, stripQuery } from "../utils/performanceAggregates";
import { formatDateWithOffset } from "../utils/utils";
import { errorMessage } from "../utils/errorMessage";
import "../css/Settings.css";
import "../css/Table.css";

const DEFAULT_LIMIT = 200;
const POLL_MS = 5000;
const TOP_SLOW_OPTIONS = [5, 10, 20, 50] as const;
type TopSlowTake = (typeof TOP_SLOW_OPTIONS)[number];

export default function PerformanceSettings() {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [limitInput, setLimitInput] = useState(String(DEFAULT_LIMIT));
  const [topSlowHttpTake, setTopSlowHttpTake] = useState<TopSlowTake>(5);
  const [topSlowDbTake, setTopSlowDbTake] = useState<TopSlowTake>(5);
  const [selectedSql, setSelectedSql] = useState<string | null>(null);
  const [sqlCopyStatus, setSqlCopyStatus] = useState<"Copy" | "Copied!">("Copy");

  const openSqlDetail = (sql: string) => {
    setSqlCopyStatus("Copy");
    setSelectedSql(sql);
  };

  const closeSqlDetail = () => {
    setSelectedSql(null);
    setSqlCopyStatus("Copy");
  };

  const copySelectedSql = async () => {
    if (selectedSql == null) return;
    const text = formatSqlForDisplay(selectedSql);
    try {
      await navigator.clipboard.writeText(text);
      setSqlCopyStatus("Copied!");
      window.setTimeout(() => setSqlCopyStatus("Copy"), 2000);
    } catch {
      setSqlCopyStatus("Copy");
    }
  };

  // ogmMutator unwraps ApiResponse — TData is the Orval payload type (items list).
  const httpQuery = useGetApiPerformanceHttpRequests<PerformancePerformanceHttpRequestsResponse>(
    { limit },
    {
      query: {
        refetchInterval: POLL_MS,
        placeholderData: (prev) => prev,
      },
    },
  );
  const dbQuery = useGetApiPerformanceDbQueries<PerformancePerformanceDbQueriesResponse>(
    { limit },
    {
      query: {
        refetchInterval: POLL_MS,
        placeholderData: (prev) => prev,
      },
    },
  );

  const clearMutation = useDeleteApiPerformance({
    mutation: {
      onSuccess: async () => {
        await Promise.all([httpQuery.refetch(), dbQuery.refetch()]);
        closeSqlDetail();
      },
    },
  });

  const httpItems: PerformancePerformanceHttpRequestEntryDto[] =
    unwrapMaybeApiResponse(httpQuery.data)?.items ?? [];
  const dbItems: PerformancePerformanceDbQueryEntryDto[] =
    unwrapMaybeApiResponse(dbQuery.data)?.items ?? [];

  const topSlowHttp = useMemo(
    () =>
      buildTopSlow(
        httpItems.map((h) => ({
          key: `${h.method ?? "?"} ${stripQuery(h.path ?? "")}`,
          label: `${h.method ?? "?"} ${stripQuery(h.path ?? "/")}`,
          durationMs: h.durationMs ?? 0,
        })),
        topSlowHttpTake,
      ),
    [httpItems, topSlowHttpTake],
  );

  const topSlowDb = useMemo(
    () =>
      buildTopSlow(
        dbItems.map((d) => {
          const fullSql = (d.sql ?? "").trim();
          const normalized = fullSql.replace(/\s+/g, " ");
          const label =
            normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized || "(empty)";
          return {
            key: normalized || "(empty)",
            label,
            durationMs: d.durationMs ?? 0,
          };
        }),
        topSlowDbTake,
      ),
    [dbItems, topSlowDbTake],
  );

  const formattedSelectedSql = useMemo(
    () => (selectedSql == null ? "" : formatSqlForDisplay(selectedSql)),
    [selectedSql],
  );

  const httpRows = httpItems.map((h, idx) => ({
    id: `${h.requestId ?? "http"}-${h.timestampUtc ?? idx}-${idx}`,
    timestamp: h.timestampUtc ? formatDateWithOffset(new Date(h.timestampUtc)) : "—",
    method: h.method ?? "—",
    path: h.path ?? "—",
    statusCode: h.statusCode ?? "—",
    durationMs: h.durationMs ?? 0,
    userName: h.userName ?? "—",
    requestId: h.requestId ?? "—",
  }));

  const dbRows = dbItems.map((d, idx) => ({
    id: `${d.requestId ?? "db"}-${d.timestampUtc ?? idx}-${idx}`,
    timestamp: d.timestampUtc ? formatDateWithOffset(new Date(d.timestampUtc)) : "—",
    durationMs: d.durationMs ?? 0,
    commandType: d.commandType ?? "—",
    succeeded: d.succeeded === false ? "fail" : "ok",
    requestId: d.requestId ?? "—",
    sql: d.sql ?? "",
  }));

  const httpColumns: GridColDef[] = [
    { field: "timestamp", headerName: "Time", width: 170 },
    { field: "method", headerName: "Method", width: 90 },
    { field: "path", headerName: "Path", flex: 1, minWidth: 220 },
    { field: "statusCode", headerName: "Status", width: 90 },
    { field: "durationMs", headerName: "ms", width: 90 },
    { field: "userName", headerName: "User", width: 120 },
    { field: "requestId", headerName: "RequestId", width: 140 },
  ];

  const dbColumns: GridColDef[] = [
    { field: "timestamp", headerName: "Time", width: 170 },
    { field: "durationMs", headerName: "ms", width: 90 },
    { field: "commandType", headerName: "Type", width: 100 },
    { field: "succeeded", headerName: "Result", width: 90 },
    { field: "requestId", headerName: "RequestId", width: 140 },
    {
      field: "sql",
      headerName: "SQL",
      flex: 1,
      minWidth: 260,
      renderCell: (params) => {
        const sql = String(params.value ?? "");
        const short = sql.length > 120 ? `${sql.slice(0, 120)}…` : sql;
        return (
          <button
            type="button"
            className="btn link"
            title={sql}
            onClick={() => openSqlDetail(sql)}
            style={{ textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
          >
            {short || "—"}
          </button>
        );
      },
    },
  ];

  const busy = httpQuery.isFetching || dbQuery.isFetching || clearMutation.isPending;
  let errorText: string | null = null;
  if (httpQuery.error) errorText = errorMessage(httpQuery.error);
  else if (dbQuery.error) errorText = errorMessage(dbQuery.error);
  else if (clearMutation.error) errorText = errorMessage(clearMutation.error);

  const applyLimit = () => {
    const n = Number(limitInput);
    if (!Number.isFinite(n)) return;
    setLimit(Math.min(2000, Math.max(1, Math.trunc(n))));
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon settings-page__h2-with-icon--flush">
        <FaTachometerAlt className="icon" aria-hidden />
        <span>Performance</span>
      </h2>

      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Slow/error HTTP API requests (≥ HttpSlowMs or 5xx) and EF SQL (≥ DbSlowMs or failed).
        Samples stay in a Redis ring (memory fallback). Auto-refresh every {POLL_MS / 1000}s.
      </p>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <label htmlFor="perf-limit">Limit</label>
        <input
          id="perf-limit"
          type="number"
          className="input"
          style={{ width: 120 }}
          min={1}
          max={2000}
          value={limitInput}
          onChange={(e) => setLimitInput(e.target.value)}
        />
        <button type="button" className="btn secondary" onClick={applyLimit}>
          Apply
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={busy}
          onClick={() => {
            void httpQuery.refetch();
            void dbQuery.refetch();
          }}
        >
          <FaSync className={`icon ${busy ? "icon-spin" : ""}`} aria-hidden /> Refresh
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Clear all HTTP and DB performance samples?")) {
              clearMutation.mutate();
            }
          }}
        >
          <FaTrash className="icon" aria-hidden /> Clear
        </button>
      </div>

      {errorText && (
        <p className="error-message" style={{ marginBottom: 14 }}>
          {errorText}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <section className="settings-card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Top slow HTTP</h3>
            <label htmlFor="perf-top-slow-http" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>Show</span>
              <select
                id="perf-top-slow-http"
                className="input"
                style={{ width: 72 }}
                aria-label="Top slow HTTP count"
                value={topSlowHttpTake}
                onChange={(e) => setTopSlowHttpTake(Number(e.target.value) as TopSlowTake)}
              >
                {TOP_SLOW_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {topSlowHttp.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No samples yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {topSlowHttp.map((item) => (
                <li key={item.key}>
                  <strong>{item.maxDurationMs} ms</strong> · {item.label}{" "}
                  <span style={{ color: "var(--text-muted)" }}>({item.samples})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="settings-card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Top slow SQL</h3>
            <label htmlFor="perf-top-slow-sql" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>Show</span>
              <select
                id="perf-top-slow-sql"
                className="input"
                style={{ width: 72 }}
                aria-label="Top slow SQL count"
                value={topSlowDbTake}
                onChange={(e) => setTopSlowDbTake(Number(e.target.value) as TopSlowTake)}
              >
                {TOP_SLOW_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {topSlowDb.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No samples yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {topSlowDb.map((item) => (
                <li key={item.key}>
                  <strong>{item.maxDurationMs} ms</strong>
                  {" · "}
                  <button
                    type="button"
                    className="btn link"
                    title="Open full SQL"
                    onClick={() => openSqlDetail(item.key === "(empty)" ? "" : item.key)}
                    style={{ textAlign: "left", verticalAlign: "baseline" }}
                  >
                    {item.label}
                  </button>{" "}
                  <span style={{ color: "var(--text-muted)" }}>({item.samples})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <h3>HTTP requests</h3>
      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8, marginBottom: 16 }}
        >
          <Grid
            gridId="performance-http-requests"
            rows={httpRows}
            columns={httpColumns}
            getRowId={(r) => (r as { id: string }).id}
            loading={httpQuery.isLoading || httpQuery.isFetching}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            localeText={{ noRowsLabel: "No slow/error HTTP samples." }}
          />
        </div>
      </CustomThemeProvider>

      <h3>DB queries</h3>
      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
        >
          <Grid
            gridId="performance-db-queries"
            rows={dbRows}
            columns={dbColumns}
            getRowId={(r) => (r as { id: string }).id}
            loading={dbQuery.isLoading || dbQuery.isFetching}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            localeText={{ noRowsLabel: "No slow/error DB samples." }}
          />
        </div>
      </CustomThemeProvider>

      {selectedSql != null && (
        <div className="modal-overlay" onClick={closeSqlDetail}>
          <div
            className="modal-content"
            style={{ maxWidth: 980, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="perf-sql-detail-title"
          >
            <div className="modal-header">
              <h3 id="perf-sql-detail-title">SQL detail</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => void copySelectedSql()}
                  disabled={!formattedSelectedSql}
                >
                  <FaCopy className="icon" aria-hidden /> {sqlCopyStatus}
                </button>
                <button
                  type="button"
                  className="modal-close"
                  aria-label="Close"
                  onClick={closeSqlDetail}
                >
                  ×
                </button>
              </div>
            </div>
            <pre
              style={{
                margin: "0 20px 20px",
                padding: 12,
                overflow: "auto",
                maxHeight: "70vh",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "var(--bg-body)",
                borderRadius: 6,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {formattedSelectedSql || "(empty)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
