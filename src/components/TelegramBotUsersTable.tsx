import React from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "./TableStyle";
import CustomThemeProvider from "./ThemeProvider";

interface TelegramBotUser {
  id: number;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  createDate: string;
  lastUpdate: string;
}

interface TelegramBotUsersTableProps {
  users: TelegramBotUser[];
}

const TelegramBotUsersTable: React.FC<TelegramBotUsersTableProps> = ({ users }) => {
  const rows = users.map((user) => ({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username ?? "-",
    fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    createDate: new Date(user.createDate).toLocaleString(),
    lastUpdate: new Date(user.lastUpdate).toLocaleString(),
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "telegramId", headerName: "Telegram ID", flex: 1 },
    { field: "username", headerName: "Username", flex: 1 },
    { field: "fullName", headerName: "Full Name", flex: 1 },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "lastUpdate", headerName: "Updated", flex: 1 },
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
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableColumnFilter
          disableColumnMenu
          localeText={{
            noRowsLabel: "📭 No users found",
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default TelegramBotUsersTable;
