import React, { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { UserDto } from "../../api/orval/model";
import "../../css/Table.css";

interface UsersTableProps {
  users: UserDto[];
  loading: boolean;
}

const UsersTable: React.FC<UsersTableProps> = ({ users, loading }) => {
  const rows = useMemo(
    () =>
      (users ?? []).map((u, idx) => {
        const id = u.id ?? idx + 1;
        return {
          id,
          displayName: u.displayName ?? "-",
          email: u.email ?? "-",
          provider: u.provider ?? "-",
          externalId: u.externalId ?? "-",
          createDate: u.createDate ? new Date(u.createDate).toLocaleString() : "-",
          lastUpdate: u.lastUpdate ? new Date(u.lastUpdate).toLocaleString() : "-",
          isAdmin: Boolean(u.isAdmin),
          isBlocked: Boolean(u.isBlocked),
          hasDashboardAccess: Boolean(u.hasDashboardAccess),
        };
      }),
    [users]
  );

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "displayName", headerName: "Display Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "provider", headerName: "Provider", flex: 0.8 },
    { field: "externalId", headerName: "External ID", flex: 0.8 },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "lastUpdate", headerName: "Updated", flex: 1 },
    { field: "isAdmin", headerName: "Admin", type: "boolean", flex: 0.5 },
    { field: "isBlocked", headerName: "Blocked", type: "boolean", flex: 0.5 },
    { field: "hasDashboardAccess", headerName: "Dashboard", type: "boolean", flex: 0.5 },
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
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
          localeText={{ noRowsLabel: "📭 No users found" }}
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default UsersTable;
