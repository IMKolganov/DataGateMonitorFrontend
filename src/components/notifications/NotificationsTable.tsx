import React, { useMemo } from "react";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { NotificationItemDto } from "../../api/orval/model";
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
    () => ({ page: page - 1, pageSize }),
    [page, pageSize]
  );
  const rows = useMemo(
    () =>
      (notifications ?? []).map((n, idx) => {
        const id = n.id ?? idx + 1;
        return {
          id,
          notificationId: n.id ?? 0,
          title: n.title ?? "-",
          message: (n.message ?? "").slice(0, 100) + ((n.message?.length ?? 0) > 100 ? "…" : ""),
          severity: n.severity ?? "-",
          isRead: Boolean(n.isRead),
          createDate: n.createdAt ? new Date(n.createdAt).toLocaleString() : "-",
          type: n.type ?? "-",
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
      field: "actions",
      headerName: "Actions",
      flex: 0.8,
      renderCell: (params) => {
        const notificationId = params.row.notificationId as number;
        const isRead = params.row.isRead as boolean;
        if (!notificationId || isRead) return null;
        return (
          <div className="action-container">
            <button
              type="button"
              className="btn secondary"
              disabled={markReadLoading}
              onClick={() => onMarkRead(notificationId)}
            >
              Mark read
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        style={{
          width: "100%",
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          disableColumnFilter
          disableColumnMenu
          localeText={{ noRowsLabel: "📭 No notifications" }}
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default NotificationsTable;
