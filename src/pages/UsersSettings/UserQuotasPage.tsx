import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { FaChartPie, FaChevronLeft, FaChevronRight, FaSync, FaTable } from "react-icons/fa";
import {
  getApiOpenVpnClientsOverviewSummary,
  getGetApiOpenVpnClientsOverviewSummaryQueryKey,
} from "../../api/orval/vpn-server-clients/vpn-server-clients";
import type { OverviewTotalsResponse, UserDto } from "../../api/orvalModelShim";
import { UserTrafficQuotaProgress } from "../../components/quota/UserTrafficQuotaProgress";
import { UserAvatar } from "../../components/ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../../utils/readOptionalAvatarUrl.ts";
import { telegramPhotoIdForProvider } from "../../utils/telegramNumericId.ts";
import { useUsers } from "./useUsers";
import "../../css/Settings.css";

function calendarMonthBounds(d = new Date()): { from: Date; to: Date } {
  const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function trafficUsedFromSummary(resp: unknown): number {
  const r = resp as OverviewTotalsResponse | undefined;
  const t = r?.totals;
  if (!t) return 0;
  const total = t.trafficTotalBytes;
  if (typeof total === "number" && Number.isFinite(total)) return total;
  return (t.trafficInBytes ?? 0) + (t.trafficOutBytes ?? 0);
}

function QuotaRow({ u }: { u: UserDto }) {
  const id = u.id;
  if (id == null || !Number.isFinite(id)) return null;
  const title = u.displayName?.trim() || `User #${id}`;
  return (
    <section className="settings-card user-quota-list__row" style={{ marginBottom: 14 }}>
      <div className="user-quota-list__row-head">
        <div className="user-quota-list__row-head-main">
          <UserAvatar
            src={readOptionalAvatarUrl(u as object)}
            telegramPhotoTelegramId={telegramPhotoIdForProvider(u.provider, u.externalId)}
            name={title}
            colorSeed={`${id}|${u.email ?? ""}`}
            size={40}
          />
          <Link to={`/settings/users/${id}`} className="user-quota-list__user-link">
            <strong>{title}</strong>
          </Link>
        </div>
        <span className="user-quota-list__email">{u.email?.trim() || "—"}</span>
      </div>
      <UserTrafficQuotaProgress userId={id} externalId={u.externalId} compact />
    </section>
  );
}

export default function UserQuotasPage() {
  const {
    users,
    totalCount,
    paginationModel,
    onPaginationModelChange,
    pageSizeOptions,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  } = useUsers({ mode: "list" });

  const monthBounds = useMemo(() => calendarMonthBounds(), []);

  const monthUsageQueries = useQueries({
    queries: users.map((u, i) => {
      const ext = typeof u.externalId === "string" ? u.externalId.trim() : "";
      const params = {
        From: monthBounds.from.toISOString(),
        To: monthBounds.to.toISOString(),
        ...(ext ? { ExternalId: ext } : {}),
      };
      if (!ext) {
        return {
          queryKey: ["user-quota-sort-month", "no-external", u.id ?? i] as const,
          queryFn: () => Promise.resolve({} as OverviewTotalsResponse),
          enabled: false,
        };
      }
      return {
        queryKey: getGetApiOpenVpnClientsOverviewSummaryQueryKey(params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getApiOpenVpnClientsOverviewSummary(params, undefined, signal),
        enabled: users.length > 0,
        staleTime: 30_000,
      };
    }),
  });

  /** Same calendar month as sort key; React Query dedupes with UserTrafficQuotaProgress when it uses monthly quota. */
  const usersSortedByMonthTraffic = useMemo(() => {
    if (users.length === 0) return users;
    const scored = users.map((u, i) => {
      const ext = u.externalId?.trim();
      if (!ext) {
        return { u, bytes: Number.NEGATIVE_INFINITY };
      }
      const bytes = trafficUsedFromSummary(monthUsageQueries[i]?.data);
      return { u, bytes };
    });
    scored.sort((a, b) => b.bytes - a.bytes);
    return scored.map((x) => x.u);
  }, [users, monthUsageQueries]);

  const page = paginationModel.page;
  const pageSize = paginationModel.pageSize;
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  const goPage = (next: number) => {
    const p = Math.max(0, Math.min(totalPages - 1, next));
    if (p !== page) onPaginationModelChange({ ...paginationModel, page: p });
  };

  return (
    <div className="user-quota-list">
      <div className="user-quota-list__toolbar">
        <h2 className="settings-page__h2-with-icon" style={{ margin: 0 }}>
          <FaChartPie className="icon" aria-hidden />
          <span>User quotas</span>
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Link to="/settings/users" className="btn secondary">
            <FaTable className="icon" /> Users table
          </Link>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-color)", margin: "12px 0" }} />
      <p className="app-settings-description">
        Same paged list as the users table (only this page is loaded from the server). Rows are ordered by{" "}
        <strong>total VPN traffic this calendar month</strong> (highest first). Users without an external ID appear
        last. Sorting the <em>entire</em> user directory by traffic would require a dedicated API (loading millions
        of clients in the browser is not feasible).
      </p>

      {errorMessage && (
        <p className="error-message" style={{ marginBottom: 12 }}>
          {errorMessage}
        </p>
      )}

      <div className="user-quota-list__controls">
        <label className="user-quota-list__label">
          Per page
          <select
            className="btn secondary dropdown-select"
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next) || next <= 0) return;
              onPaginationModelChange({ page: 0, pageSize: next });
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="user-quota-list__pager">
          <button
            type="button"
            className="btn secondary"
            onClick={() => goPage(page - 1)}
            disabled={page <= 0 || anyLoading}
            aria-label="Previous page"
          >
            <FaChevronLeft className="icon" />
          </button>
          <span className="user-quota-list__pageinfo">
            Page {page + 1} / {totalPages}
            <span className="user-quota-list__count"> · {totalCount} users</span>
          </span>
          <button
            type="button"
            className="btn secondary"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages - 1 || anyLoading}
            aria-label="Next page"
          >
            <FaChevronRight className="icon" />
          </button>
        </div>
      </div>

      {anyLoading && users.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        usersSortedByMonthTraffic.map((u, idx) => <QuotaRow key={u.id ?? `row-${idx}`} u={u} />)
      )}

      {users.length === 0 && !anyLoading && (
        <p style={{ color: "var(--text-muted)" }}>No users on this page.</p>
      )}
    </div>
  );
}
