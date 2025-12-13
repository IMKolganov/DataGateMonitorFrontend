import React, { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { FaBan, FaUserShield } from "react-icons/fa";
import type { TelegramBotUserDto, TelegramUserActionRequest } from "../../api/orval/model";
import {
  usePostApiTgbotUsersBlock,
  usePostApiTgbotUsersUnblock,
  usePostApiTgbotUsersSetAdmin,
  usePostApiTgbotUsersUnsetAdmin,
} from "../../api/orval/telegram-bot-user/telegram-bot-user.ts";
import "../../css/Table.css";

interface TelegramBotUsersTableProps {
  users: TelegramBotUserDto[];
  refreshUsers: () => void;
  loading: boolean; // loading from data-fetch (query)
}

const TelegramBotUsersTable: React.FC<TelegramBotUsersTableProps> = ({
  users,
  refreshUsers,
  loading,
}) => {
  const [mutationLoading, setMutationLoading] = useState(false);

  const mBlock = usePostApiTgbotUsersBlock();
  const mUnblock = usePostApiTgbotUsersUnblock();
  const mSetAdmin = usePostApiTgbotUsersSetAdmin();
  const mUnsetAdmin = usePostApiTgbotUsersUnsetAdmin();

  const blockUser = async (telegramId: number) =>
    mBlock.mutateAsync({ data: { telegramId } as TelegramUserActionRequest });

  const unblockUser = async (telegramId: number) =>
    mUnblock.mutateAsync({ data: { telegramId } as TelegramUserActionRequest });

  const setAdmin = async (telegramId: number) =>
    mSetAdmin.mutateAsync({ data: { telegramId } as TelegramUserActionRequest });

  const unsetAdmin = async (telegramId: number) =>
    mUnsetAdmin.mutateAsync({ data: { telegramId } as TelegramUserActionRequest });

  const handleToggleBlock = async (telegramId: number, isBlocked: boolean) => {
    if (!telegramId) return;
    setMutationLoading(true);
    try {
      isBlocked ? await unblockUser(telegramId) : await blockUser(telegramId);
      await refreshUsers();
    } finally {
      setMutationLoading(false);
    }
  };

  const handleToggleAdmin = async (telegramId: number, isAdmin: boolean) => {
    if (!telegramId) return;
    setMutationLoading(true);
    try {
      isAdmin ? await unsetAdmin(telegramId) : await setAdmin(telegramId);
      await refreshUsers();
    } finally {
      setMutationLoading(false);
    }
  };

  const rows = useMemo(
    () =>
      (users ?? []).map((u, idx) => {
        const id = u.id ?? u.telegramId ?? idx + 1;
        const telegramId = u.telegramId ?? 0;
        return {
          id,
          telegramId,
          username: u.username ?? "-",
          fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "-",
          createDate: u.createDate ? new Date(u.createDate).toLocaleString() : "-",
          lastUpdate: u.lastUpdate ? new Date(u.lastUpdate).toLocaleString() : "-",
          isAdmin: Boolean(u.isAdmin),
          isBlocked: Boolean(u.isBlocked),
        };
      }),
    [users]
  );

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
      renderCell: (params) => {
        const tid: number = params.row.telegramId || 0;
        const isBlocked: boolean = !!params.row.isBlocked;
        const isAdmin: boolean = !!params.row.isAdmin;
        const disabled = mutationLoading || !tid;

        return (
          <div className="action-container">
            <button
              className="btn danger"
              disabled={disabled}
              onClick={() => handleToggleBlock(tid, isBlocked)}
            >
              <FaBan className="icon" /> {isBlocked ? "Unblock" : "Block"}
            </button>

            <button
              className="btn danger"
              disabled={disabled}
              onClick={() => handleToggleAdmin(tid, isAdmin)}
            >
              <FaUserShield className="icon" /> {isAdmin ? "Unset Admin" : "Set Admin"}
            </button>
          </div>
        );
      },
    },
  ];

  const isGridLoading = loading || mutationLoading;

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
          loading={isGridLoading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default TelegramBotUsersTable;
