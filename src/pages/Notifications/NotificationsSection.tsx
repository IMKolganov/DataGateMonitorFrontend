import { FaBell, FaCheckDouble, FaSync } from "react-icons/fa";
import NotificationsTable from "../../components/notifications/NotificationsTable";
import type { NotificationItemDto } from "../../api/orvalModelShim";
import type { NotificationReadFilter } from "./useNotifications";
import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

const SEVERITY_LABELS = ["Info", "Warning", "Error", "Critical"] as const;

export function NotificationsSection({
  notifications,
  totalCount,
  page,
  pageSize,
  onPaginationModelChange,
  readFilter,
  onReadFilterChange,
  typeFilter,
  onTypeFilterChange,
  severityEnabled,
  onToggleSeverity,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
  onMarkRead,
  markReadLoading,
  onMarkReadAll,
  markReadAllLoading,
  onSendTest,
  sendTestLoading,
  showSendTest,
}: {
  notifications: NotificationItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  readFilter: NotificationReadFilter;
  onReadFilterChange: (v: NotificationReadFilter) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  severityEnabled: [boolean, boolean, boolean, boolean];
  onToggleSeverity: (index: 0 | 1 | 2 | 3) => void;
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
  onMarkRead: (id: number) => void;
  markReadLoading: boolean;
  onMarkReadAll: () => void;
  markReadAllLoading: boolean;
  onSendTest: () => void;
  sendTestLoading: boolean;
  showSendTest: boolean;
}) {
  return (
    <>
      <div
        className="notifications-filters"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 20px",
          alignItems: "center",
          marginBottom: 16,
          padding: "10px 0",
          borderBottom: "1px solid var(--border-muted, #30363d)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--text-secondary, #8b949e)", fontSize: 14 }}>Read</span>
          <select
            id="notifications-read-filter"
            name="notificationsReadFilter"
            className="input"
            value={readFilter}
            onChange={(e) => onReadFilterChange(e.target.value as NotificationReadFilter)}
            aria-label="Filter by read status"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px" }}>
          <span style={{ color: "var(--text-secondary, #8b949e)", fontSize: 14, whiteSpace: "nowrap" }}>
            Type
          </span>
          <input
            id="notifications-type-filter"
            name="notificationsTypeFilter"
            type="text"
            className="input"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            placeholder="Contains…"
            maxLength={256}
            aria-label="Filter by notification type"
            style={{ minWidth: 140, flex: 1 }}
          />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary, #8b949e)", fontSize: 14 }}>Severity</span>
          {SEVERITY_LABELS.map((label, i) => (
            <label
              key={label}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}
            >
              <input
                id={`notifications-severity-${i}`}
                name={`notificationsSeverity${i}`}
                type="checkbox"
                checked={severityEnabled[i]}
                onChange={() => onToggleSeverity(i as 0 | 1 | 2 | 3)}
                aria-label={`Filter severity ${label}`}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="header-bar">
        <div className="left-buttons">
          <button
            type="button"
            className="btn secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={onMarkReadAll}
            disabled={markReadAllLoading}
          >
            <FaCheckDouble className="icon" /> Mark read all
          </button>
          {showSendTest && (
            <button
              type="button"
              className="btn secondary"
              onClick={onSendTest}
              disabled={sendTestLoading}
            >
              <FaBell className="icon" /> Send test notification
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div>
          <p className="error-message">❌ {errorMessage}</p>
        </div>
      )}

      <NotificationsTable
        notifications={notifications}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPaginationModelChange={onPaginationModelChange}
        loading={anyLoading}
        onMarkRead={onMarkRead}
        markReadLoading={markReadLoading}
      />
    </>
  );
}
