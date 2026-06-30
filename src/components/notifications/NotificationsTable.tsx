import React, { useMemo, useState, useCallback } from "react";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { NotificationItemDto } from "../../api/orvalModelShim";
import { FaCheck, FaExpandAlt } from "react-icons/fa";
import "../../css/Table.css";
import "../../css/Settings.css";

const MESSAGE_TRUNCATE_LENGTH = 80;

/** IDE-style severity: 0=Info, 1=Warning, 2=Error, 3=Critical */
const SEVERITY_CONFIG: Record<
  number,
  { label: string; badgeClass: string; rowClass: string }
> = {
  0: { label: "Info", badgeClass: "notification-severity-badge--info", rowClass: "severity-info" },
  1: { label: "Warning", badgeClass: "notification-severity-badge--warning", rowClass: "severity-warning" },
  2: { label: "Error", badgeClass: "notification-severity-badge--error", rowClass: "severity-error" },
  3: { label: "Critical", badgeClass: "notification-severity-badge--critical", rowClass: "severity-critical" },
};

function getSeverityConfig(severity: number | null | undefined) {
  if (severity == null) return { label: "—", badgeClass: "notification-severity-badge--unknown", rowClass: "" };
  return SEVERITY_CONFIG[severity] ?? {
    label: `Lvl ${severity}`,
    badgeClass: "notification-severity-badge--unknown",
    rowClass: "",
  };
}

interface NotificationsTableProps {
  notifications: NotificationItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  loading: boolean;
  onMarkRead: (notificationId: number) => void;
  markReadLoading: boolean;
}

const NotificationsTable: React.FC<NotificationsTableProps> = ({
  notifications,
  totalCount,
  page,
  pageSize,
  onPaginationModelChange,
  loading,
  onMarkRead,
  markReadLoading,
}) => {
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const openDetails = useCallback((message: string) => setDetailsMessage(message), []);
  const closeDetails = useCallback(() => setDetailsMessage(null), []);

  const paginationModel: GridPaginationModel = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize]
  );

  const rows = useMemo(
    () =>
      (notifications ?? []).map((n, idx) => {
        const id = n.id ?? idx + 1;
        const notificationId = n.id ?? 0;
        const messageRaw = n.message ?? "";
        const message = messageRaw || "-";
        const severityNum = n.severity ?? null;
        const severityCfg = getSeverityConfig(severityNum);

        return {
          id,
          notificationId,
          title: n.title ?? "-",
          message,
          severityNum,
          severityLabel: severityCfg.label,
          severityBadgeClass: severityCfg.badgeClass,
          severityRowClass: severityCfg.rowClass,
          isRead: Boolean(n.isRead),
          createDate: n.createdAt ? new Date(n.createdAt).toLocaleString() : "-",
          type: n.type != null ? String(n.type) : "-",
        };
      }),
    [notifications]
  );

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "title", headerName: "Title", flex: 1, minWidth: 140 },
    {
      field: "message",
      headerName: "Message",
      flex: 2,
      minWidth: 200,
      renderCell: (params) => {
        const msg = params.value as string;
        const isLong = msg.length > MESSAGE_TRUNCATE_LENGTH;
        const display = isLong
          ? `${msg.slice(0, MESSAGE_TRUNCATE_LENGTH)}…`
          : msg;
        return (
          <div className="notification-message-cell">
            <span className="message-text" title={isLong ? msg : undefined}>
              {display}
            </span>
            {isLong && (
              <button
                type="button"
                className="btn secondary notification-details-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetails(msg);
                }}
                title="Show full message"
              >
                <FaExpandAlt className="icon" /> Show details
              </button>
            )}
          </div>
        );
      },
    },
    {
      field: "severityLabel",
      headerName: "Severity",
      width: 100,
      renderCell: (params) => (
        <span
          className={`notification-severity-badge ${params.row.severityBadgeClass}`}
          title={params.row.severityNum != null ? `Level ${params.row.severityNum}` : undefined}
        >
          {params.value}
        </span>
      ),
    },
    { field: "createDate", headerName: "Created", flex: 0.9, minWidth: 140 },
    { field: "isRead", headerName: "Read", type: "boolean", width: 70 },
    {
      field: "Actions",
      headerName: "Actions",
      flex: 1,
      cellClassName: "grid-cell-actions",
      renderCell: (params) => {
        const notificationId: number = params.row.notificationId || 0;
        const isRead: boolean = !!params.row.isRead;

        const disabled = markReadLoading || !notificationId || isRead;

        return (
          <div className="action-container">
            <button
              type="button"
              className="btn secondary"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onMarkRead(notificationId);
              }}
            >
              <FaCheck className="icon" /> Mark read
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        className="data-grid-wrap notifications-table-wrapper"
        style={{
          backgroundColor: "var(--bg-body)",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <Grid
          gridId="notifications"
          rows={rows}
          columns={columns}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            onPaginationModelChange(model);
          }}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          disableRowSelectionOnClick
          getRowClassName={(params) => params.row.severityRowClass ?? ""}
          localeText={{ noRowsLabel: "📭 No notifications" }}
          loading={loading}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />

        {detailsMessage != null && (
          <div className="modal-overlay" onClick={closeDetails}>
            <div
              className="modal-content notification-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Message details</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeDetails}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="notification-details-body">
                <pre>{detailsMessage}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomThemeProvider>
  );
};

export default NotificationsTable;
