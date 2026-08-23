import React, { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { NotificationItemDto } from "../../api/orvalModelShim";
import { FaCheck, FaExpandAlt, FaServer } from "react-icons/fa";
import { GridRowActions, RowActionButton } from "../ui/GridRowActions.tsx";
import { openPendingServerDiscovery } from "../servers/pendingServerDiscoveryEvents";
import "../../css/Table.css";
import "../../css/Settings.css";

const MESSAGE_TRUNCATE_LENGTH = 80;
const SERVER_DISCOVERED_TYPE = "server.discovered";

function parseDiscoveryIdFromMessage(message: string): number | undefined {
  const match = /DiscoveryId=(\d+)/i.exec(message);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : undefined;
}

function formatServerDiscoveredMessage(message: string): string {
  const discoveryId = parseDiscoveryIdFromMessage(message);
  const nameMatch = /(?:^|;\s*)Name=([^;]*)/i.exec(message);
  const apiUrlMatch = /(?:^|;\s*)ApiUrl=([^;]*)/i.exec(message);
  const name = nameMatch?.[1]?.trim();
  const apiUrl = apiUrlMatch?.[1]?.trim();
  const parts = [
    "A new VPN server was discovered and is waiting for admin approval.",
    discoveryId != null ? `Discovery #${discoveryId}` : null,
    name ? `Suggested name: ${name}` : null,
    apiUrl ? `API URL: ${apiUrl}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

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
  if (severity == null) {
    return { label: "—", badgeClass: "notification-severity-badge--unknown", rowClass: "" };
  }
  return (
    SEVERITY_CONFIG[severity] ?? {
      label: `Lvl ${severity}`,
      badgeClass: "notification-severity-badge--unknown",
      rowClass: "",
    }
  );
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
    [page, pageSize],
  );

  const rows = useMemo(
    () =>
      (notifications ?? []).map((n, idx) => {
        const id = n.id ?? idx + 1;
        const notificationId = n.id ?? 0;
        const type = n.type != null ? String(n.type) : "-";
        const messageRaw = n.message ?? "";
        const message =
          type === SERVER_DISCOVERED_TYPE && messageRaw
            ? formatServerDiscoveredMessage(messageRaw)
            : messageRaw || "-";
        const severityNum = n.severity ?? null;
        const severityCfg = getSeverityConfig(severityNum);
        const discoveryId =
          type === SERVER_DISCOVERED_TYPE ? parseDiscoveryIdFromMessage(messageRaw) : undefined;

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
          type,
          discoveryId,
        };
      }),
    [notifications],
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
        const display = isLong ? `${msg.slice(0, MESSAGE_TRUNCATE_LENGTH)}…` : msg;
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
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      filterable: false,
      cellClassName: "grid-cell-actions",
      renderCell: (params) => {
        const notificationId: number = params.row.notificationId || 0;
        const isRead: boolean = !!params.row.isRead;
        const isDiscovered = params.row.type === SERVER_DISCOVERED_TYPE;
        const discoveryId: number | undefined = params.row.discoveryId;
        const disabled = markReadLoading || !notificationId || isRead;

        return (
          <GridRowActions>
            {isDiscovered && (
              <RowActionButton
                title="Review discovered server"
                onClick={() => openPendingServerDiscovery(discoveryId)}
                icon={<FaServer className="icon" />}
              />
            )}
            {isDiscovered && (
              <Link
                to="/servers"
                className="btn secondary"
                title="Open servers list"
                style={{ padding: "4px 8px", fontSize: 12, textDecoration: "none" }}
                onClick={(e) => e.stopPropagation()}
              >
                Servers
              </Link>
            )}
            <RowActionButton
              title={isRead ? "Already read" : "Mark read"}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onMarkRead(notificationId);
              }}
              icon={<FaCheck className="icon" />}
            />
          </GridRowActions>
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
