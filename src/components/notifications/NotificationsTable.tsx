import React, { useMemo } from "react";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { NotificationItemDto } from "../../api/orval/model";
import { FaCheck } from "react-icons/fa";
import "../../css/Table.css";

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
        const message =
          messageRaw.length > 100 ? `${messageRaw.slice(0, 100)}…` : messageRaw || "-";

        return {
          id,
          notificationId,
          title: n.title ?? "-",
          message,
          severity: n.severity != null ? String(n.severity) : "-",
          isRead: Boolean(n.isRead),
          createDate: n.createdAt ? new Date(n.createdAt).toLocaleString() : "-",
          type: n.type != null ? String(n.type) : "-",
        };
      }),
    [notifications]
  );

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "message", headerName: "Message", flex: 2 },
    { field: "severity", headerName: "Severity", flex: 0.5 },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "isRead", headerName: "Read", type: "boolean", flex: 0.5 },
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
                // Logs to prove click reached this handler
                console.debug("[NotificationsTable] Mark read click", {
                  notificationId,
                  disabled,
                  isRead,
                  markReadLoading,
                  rowId: params.row.id,
                });

                if (disabled) return;

                console.debug("[NotificationsTable] Calling onMarkRead()", {
                  notificationId,
                });

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
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => {
            console.debug("[NotificationsTable] Pagination changed", model);
            onPaginationModelChange(model);
          }}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          disableColumnFilter
          disableColumnMenu
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: "📭 No notifications" }}
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default NotificationsTable;
