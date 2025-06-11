import React, { useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "./TableStyle";
import CustomThemeProvider from "./ThemeProvider";
import {
  blockUser,
  unblockUser,
  setAdmin,
  unsetAdmin,
} from "../utils/api";
import { FaBan, FaUserShield } from "react-icons/fa";

interface TelegramBotUser {
  id: number;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  createDate: string;
  lastUpdate: string;
  isAdmin: boolean;
  isBlocked: boolean;
}

interface TelegramBotUsersTableProps {
  users: TelegramBotUser[];
  refreshUsers: () => void;
}

const TelegramBotUsersTable: React.FC<TelegramBotUsersTableProps> = ({ users, refreshUsers }) => {
  const [loading, setLoading] = useState(false);

  const handleToggleBlock = async (telegramId: number, isBlocked: boolean) => {
    setLoading(true);
    try {
      isBlocked ? await unblockUser(telegramId) : await blockUser(telegramId);
      refreshUsers();
    } catch (error) {
      console.error("Failed to toggle block:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (telegramId: number, isAdmin: boolean) => {
    setLoading(true);
    try {
      isAdmin ? await unsetAdmin(telegramId) : await setAdmin(telegramId);
      refreshUsers();
    } catch (error) {
      console.error("Failed to toggle admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const rows = users.map((user) => ({
    id: user.id,
    telegramId: user.telegramId,
    username: user.username ?? "-",
    fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    createDate: new Date(user.createDate).toLocaleString(),
    lastUpdate: new Date(user.lastUpdate).toLocaleString(),
    isAdmin: user.isAdmin,
    isBlocked: user.isBlocked,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "telegramId", headerName: "Telegram ID", flex: 1 },
    { field: "username", headerName: "Username", flex: 1 },
    { field: "fullName", headerName: "Full Name", flex: 1 },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "lastUpdate", headerName: "Updated", flex: 1 },
    { field: "isAdmin", headerName: "Admin", type: "boolean", flex: 0.5 },
    { field: "isBlocked", headerName: "Blocked", type: "boolean", flex: 0.5 },
    {
      field: "Actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <div className="action-container">
          <button
            className="btn danger"
            disabled={loading}
            onClick={() => handleToggleBlock(params.row.telegramId, params.row.isBlocked)}
          >
            <FaBan className="icon" /> {params.row.isBlocked ? "Unblock" : "Block"}
          </button>

          <button
            className="btn danger"
            disabled={loading}
            onClick={() => handleToggleAdmin(params.row.telegramId, params.row.isAdmin)}
          >
            <FaUserShield className="icon" /> {params.row.isAdmin ? "Unset Admin" : "Set Admin"}
          </button>
        </div>

      ),
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
