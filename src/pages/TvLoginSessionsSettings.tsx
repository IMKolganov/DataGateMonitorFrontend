import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaSync, FaTv } from "react-icons/fa";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { useGetApiAdminTvLoginSessions } from "../api/orval/tv-login-sessions-admin/tv-login-sessions-admin";
import type {
  AdminTvLoginSessionDto,
  GetAdminTvLoginSessionsResponse,
} from "../api/orvalModelShim";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { formatDateWithOffset } from "../utils/utils";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import "../css/Settings.css";
import "../css/Table.css";

const STATUS_OPTIONS = [
  "",
  "pending",
  "viewed",
  "approved",
  "denied",
  "expired",
  "consumed",
] as const;

export default function TvLoginSessionsSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const initialUserId = userIdParam != null && userIdParam !== "" ? Number(userIdParam) : undefined;

  const [status, setStatus] = useState("");
  const [userIdFilter, setUserIdFilter] = useState(
    Number.isFinite(initialUserId) ? String(initialUserId) : "",
  );
  const [pageSize, setPageSize] = usePersistedPageSize(
    "settings-tv-login-sessions",
    25,
    "10,25,50,100",
  );
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize,
  });

  const approvedUserId = useMemo(() => {
    const n = Number(userIdFilter);
    return userIdFilter.trim() !== "" && Number.isFinite(n) ? n : undefined;
  }, [userIdFilter]);

  const listQuery = useGetApiAdminTvLoginSessions<GetAdminTvLoginSessionsResponse>(
    {
      approvedUserId,
      status: status || undefined,
      skip: paginationModel.page * paginationModel.pageSize,
      take: paginationModel.pageSize,
    },
    { query: { placeholderData: (prev) => prev } },
  );

  const payload = unwrapMaybeApiResponse(listQuery.data);
  const sessions = payload?.sessions ?? [];
  const totalCount = payload?.totalCount ?? 0;

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
        return (
          <Link to={`/settings/users/${uid}`}>{String(params.value)}</Link>
        );
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
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaTv className="icon" aria-hidden />
        <span>TV device linking</span>
      </h2>
      <p className="settings-description">
        Sessions created by TVs for QR / code login. Approved and consumed rows show which user
        linked the device.
      </p>

      <section className="settings-card settings-card--mb">
        <div className="settings-item">
          <label>
            User ID{" "}
            <input
              className="input"
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
          <label>
            Status{" "}
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "All"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            <FaSync className="icon" aria-hidden /> Refresh
          </button>
        </div>
      </section>

      <section className="settings-card">
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
              paginationMode="server"
              rowCount={totalCount}
              paginationModel={paginationModel}
              onPaginationModelChange={(model) => {
                setPaginationModel(model);
                if (model.pageSize !== pageSize) setPageSize(model.pageSize);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              localeText={{ noRowsLabel: "No TV login sessions" }}
            />
          </div>
        </CustomThemeProvider>
      </section>
    </div>
  );
}
