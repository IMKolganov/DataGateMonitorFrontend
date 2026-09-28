import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaSync, FaTv } from "react-icons/fa";
import type { GridColDef } from "@mui/x-data-grid";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { useGetApiV2AdminTvLoginSessions } from "../api/orval/tv-login-sessions-admin-v2/tv-login-sessions-admin-v2";
import type { AdminTvLoginSessionDto } from "../api/orvalModelShim";
import type { AuthResponsesGetAdminTvLoginSessionsV2Response } from "../api/orval/model/authResponsesGetAdminTvLoginSessionsV2Response";
import { formatDateWithOffset } from "../utils/utils";
import { errorMessage } from "../utils/errorMessage";
import { useServerGridPagination } from "../hooks/useServerGridPagination";
import "../css/Settings.css";
import "../css/Table.css";
import "../css/GridFilterBar.css";

const STATUS_OPTIONS = [
  "",
  "pending",
  "viewed",
  "approved",
  "denied",
  "expired",
  "consumed",
] as const;

/** ogmMutator unwraps ApiResponse.data at runtime; Orval types still use the Api* wrapper. */
function unwrapTvLoginSessionsV2(raw: unknown): AuthResponsesGetAdminTvLoginSessionsV2Response {
  return (raw ?? {}) as AuthResponsesGetAdminTvLoginSessionsV2Response;
}

export default function TvLoginSessionsSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const initialUserId = userIdParam != null && userIdParam !== "" ? Number(userIdParam) : undefined;

  const [status, setStatus] = useState("");
  const [userIdFilter, setUserIdFilter] = useState(
    Number.isFinite(initialUserId) ? String(initialUserId) : "",
  );
  const [rowCount, setRowCount] = useState(0);

  const approvedUserId = useMemo(() => {
    const n = Number(userIdFilter);
    return userIdFilter.trim() !== "" && Number.isFinite(n) ? n : undefined;
  }, [userIdFilter]);

  const resetKey = `${approvedUserId ?? "all"}:${status || "all"}`;

  const paging = useServerGridPagination({
    storageKey: "settings-tv-login-sessions",
    defaultPageSize: 25,
    allowedKey: "10,25,50,100",
    rowCount,
    resetKey,
  });

  const listQuery = useGetApiV2AdminTvLoginSessions(
    {
      ApprovedUserId: approvedUserId,
      Status: status || undefined,
      Page: paging.apiPage,
      PageSize: paging.pageSize,
    },
    { query: { placeholderData: (prev) => prev } },
  );

  const payload = unwrapTvLoginSessionsV2(listQuery.data);
  const sessionsPage = payload.sessions;

  useEffect(() => {
    if (typeof sessionsPage?.totalCount === "number") {
      setRowCount(sessionsPage.totalCount);
    }
  }, [sessionsPage?.totalCount]);

  const sessions = sessionsPage?.items ?? [];
  const totalCount = paging.rowCount;

  const rows = sessions.map((s: AdminTvLoginSessionDto, idx: number) => ({
    id: s.sessionId ?? `${idx}`,
    userCode: s.userCode ?? "—",
    status: s.status ?? "—",
    deviceName: s.deviceName ?? "—",
    client: s.client ?? "—",
    approvedUserId: s.approvedUserId ?? null,
    approvedUser:
      s.approvedUserDisplayName?.trim() ||
      s.approvedUserEmail?.trim() ||
      (s.approvedUserId != null ? `#${s.approvedUserId}` : "—"),
    createDate: s.createDate ? formatDateWithOffset(new Date(s.createDate)) : "—",
    expiresAt: s.expiresAt ? formatDateWithOffset(new Date(s.expiresAt)) : "—",
    completedAt: s.completedAt ? formatDateWithOffset(new Date(s.completedAt)) : "—",
  }));

  const columns: GridColDef[] = [
    { field: "userCode", headerName: "Code", width: 100 },
    { field: "status", headerName: "Status", width: 110 },
    { field: "deviceName", headerName: "Device", flex: 1, minWidth: 140 },
    { field: "client", headerName: "Client", width: 110 },
    {
      field: "approvedUser",
      headerName: "User",
      flex: 1,
      minWidth: 160,
      renderCell: (params) => {
        const uid = params.row.approvedUserId as number | null;
        if (uid == null) return params.value;
        return <Link to={`/settings/users/${uid}`}>{String(params.value)}</Link>;
      },
    },
    { field: "createDate", headerName: "Created", width: 170 },
    { field: "expiresAt", headerName: "Expires", width: 170 },
    { field: "completedAt", headerName: "Completed", width: 170 },
  ];

  const applyUserFilter = () => {
    const next = new URLSearchParams(searchParams);
    if (approvedUserId != null) next.set("userId", String(approvedUserId));
    else next.delete("userId");
    setSearchParams(next, { replace: true });
    paging.resetPage();
  };

  return (
    <div>
      <div className="page-header-row">
        <h2 className="settings-page__h2-with-icon settings-page__h2-with-icon--flush">
          <FaTv className="icon" aria-hidden />
          <span>TV device linking</span>
        </h2>
        <button
          type="button"
          className="btn secondary"
          onClick={() => void listQuery.refetch()}
          disabled={listQuery.isFetching}
        >
          <FaSync className={`icon ${listQuery.isFetching ? "icon-spin" : ""}`} aria-hidden />{" "}
          Refresh
        </button>
      </div>
      <div className="settings-divider" />
      <p className="settings-description" style={{ textAlign: "left", marginBottom: 12 }}>
        Sessions created by TVs for QR / code login. Approved and consumed rows show which user
        linked the device
        {totalCount > 0 ? ` (${totalCount})` : ""}.
      </p>

      <div className="grid-filter-bar" data-grid-id="tv-login-sessions">
        <div className="grid-filter-bar__row">
          <div className="grid-filter-bar__fields">
            <label className="grid-filter-bar__field" htmlFor="tv-login-user-id">
              <span className="grid-filter-bar__label">User ID</span>
              <input
                id="tv-login-user-id"
                className="input grid-filter-bar__input"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                onBlur={applyUserFilter}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyUserFilter();
                }}
                placeholder="All users"
                inputMode="numeric"
              />
            </label>
            <label className="grid-filter-bar__field" htmlFor="tv-login-status">
              <span className="grid-filter-bar__label">Status</span>
              <select
                id="tv-login-status"
                className="input grid-filter-bar__input"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  paging.resetPage();
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "All"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {listQuery.error ? (
        <p className="error-message">{errorMessage(listQuery.error)}</p>
      ) : null}

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: "10px", borderRadius: "8px" }}
        >
          <Grid
            gridId="tv-login-sessions"
            rows={rows}
            columns={columns}
            loading={listQuery.isLoading || listQuery.isFetching}
            {...paging.gridProps}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No TV login sessions" }}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
}
