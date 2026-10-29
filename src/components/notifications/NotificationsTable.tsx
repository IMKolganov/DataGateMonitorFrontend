import React, { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type {
  NotificationDeliveryDto,
  NotificationItemDto,
} from "../../api/orvalModelShim";
import { EnumsDeliveryStatus } from "../../api/orval/model";
import { FaCheck, FaExpandAlt, FaServer } from "react-icons/fa";
import { GridRowActions, RowActionButton } from "../ui/GridRowActions.tsx";
import { SectionErrorBoundary } from "../ui/SectionErrorBoundary.tsx";
import {
  MESSAGE_TRUNCATE_LENGTH,
  SERVER_DISCOVERED_TYPE,
  deliveryBadgeClass,
  formatDeliveriesSummary,
  formatDeliveryLine,
  formatNotificationMessage,
  parseDiscoveryIdFromMessage,
} from "../../utils/notifications/notificationMessageFormat";
import "../../css/Table.css";
import "../../css/Settings.css";

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
  const [detailsText, setDetailsText] = useState<string | null>(null);
  const navigate = useNavigate();
  const openDetails = useCallback((text: string) => setDetailsText(text), []);
  const closeDetails = useCallback(() => setDetailsText(null), []);

  const paginationModel: GridPaginationModel = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );

  const rows = useMemo(
    () =>
      (notifications ?? []).map((n, idx) => {
        try {
          const id = n.id ?? idx + 1;
          const notificationId = n.id ?? 0;
          const type = n.type != null ? String(n.type) : "-";
          const messageRaw = n.message ?? "";
          const message = formatNotificationMessage(type, messageRaw);
          const severityNum = n.severity ?? null;
          const severityCfg = getSeverityConfig(severityNum);
          const discoveryId =
            type === SERVER_DISCOVERED_TYPE ? parseDiscoveryIdFromMessage(messageRaw) : undefined;

          const deliveries = n.deliveries ?? [];
          const deliveryFailed = deliveries.some((d) => d.status === EnumsDeliveryStatus.NUMBER_2);
          const detailsParts = [
            messageRaw ? `${message}\n\nRaw: ${messageRaw}` : message,
            deliveries.length
              ? `\n\nDelivery:\n${formatDeliveriesSummary(deliveries)}`
              : "\n\nDelivery:\n(no channel attempts recorded)",
          ];

          return {
            id,
            notificationId,
            title: n.title ?? "-",
            message,
            detailsText: detailsParts.join(""),
            deliveries,
            deliveryFailed,
            severityNum,
            severityLabel: severityCfg.label,
            severityBadgeClass: severityCfg.badgeClass,
            severityRowClass: severityCfg.rowClass,
            isRead: Boolean(n.isRead),
            createDate: n.createdAt ? new Date(n.createdAt).toLocaleString() : "-",
            type,
            discoveryId,
          };
        } catch {
          const id = n.id ?? idx + 1;
          return {
            id,
            notificationId: n.id ?? 0,
            title: n.title ?? "-",
            message: n.message ?? "-",
            detailsText: n.message ?? "-",
            deliveries: n.deliveries ?? [],
            deliveryFailed: false,
            severityNum: n.severity ?? null,
            severityLabel: "—",
            severityBadgeClass: "notification-severity-badge--unknown",
            severityRowClass: "",
            isRead: Boolean(n.isRead),
            createDate: n.createdAt ? new Date(n.createdAt).toLocaleString() : "-",
            type: n.type != null ? String(n.type) : "-",
            discoveryId: undefined,
          };
        }
      }),
    [notifications],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "title", headerName: "Title", flex: 1, minWidth: 140 },
      {
        field: "message",
        headerName: "Message",
        flex: 2,
        minWidth: 220,
        renderCell: (params) => {
          const msg = params.value as string;
          const isLong = msg.length > MESSAGE_TRUNCATE_LENGTH;
          const display = isLong ? `${msg.slice(0, MESSAGE_TRUNCATE_LENGTH)}…` : msg;
          const details = params.row.detailsText as string;
          const showDetails = isLong || Boolean(params.row.deliveryFailed);
          return (
            <div className="notification-message-cell">
              <span className="message-text" title={isLong ? msg : undefined}>
                {display}
              </span>
              {showDetails && (
                <button
                  type="button"
                  className="btn secondary notification-details-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetails(details);
                  }}
                  title="Show full message and delivery status"
                >
                  <FaExpandAlt className="icon" /> Show details
                </button>
              )}
            </div>
          );
        },
      },
      {
        field: "deliveries",
        headerName: "Delivery",
        width: 280,
        sortable: false,
        renderCell: (params) => {
          const deliveries = (params.row.deliveries ?? []) as NotificationDeliveryDto[];
          if (!deliveries.length) {
            return <span className="notification-delivery-empty">—</span>;
          }
          return (
            <div className="notification-delivery-cell" title={formatDeliveriesSummary(deliveries)}>
              {deliveries.map((d, idx) => {
                const hasError = Boolean(d.error);
                return (
                  <span
                    key={`${d.channel ?? "ch"}-${idx}`}
                    className={`notification-delivery-badge ${deliveryBadgeClass(d.status)}${
                      hasError ? " notification-delivery-badge--with-error" : ""
                    }`}
                  >
                    {formatDeliveryLine(d, "compact")}
                  </span>
                );
              })}
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
                  onClick={() => {
                    if (discoveryId != null) {
                      navigate(`/servers/pending-discoveries/${discoveryId}`);
                    } else {
                      navigate("/servers/pending-discoveries");
                    }
                  }}
                  icon={<FaServer className="icon" />}
                />
              )}
              {isDiscovered && (
                <Link
                  to="/servers/pending-discoveries"
                  className="btn secondary"
                  title="Open pending discoveries"
                  style={{ padding: "4px 8px", fontSize: 12, textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Pending
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
    ],
    [markReadLoading, navigate, onMarkRead, openDetails],
  );

  return (
    <CustomThemeProvider>
      <SectionErrorBoundary title="Notifications table failed to render.">
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

          {detailsText != null && (
            <div className="modal-overlay" onClick={closeDetails}>
              <div
                className="modal-content notification-details-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>Message & delivery details</h3>
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
                  <pre>{detailsText}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionErrorBoundary>
    </CustomThemeProvider>
  );
};

export default NotificationsTable;
