import React, { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { FaBan, FaUserShield } from "react-icons/fa";
import type { TelegramBotUserDto, TelegramUserActionRequest } from "../../api/orvalModelShim";
import {
  usePostApiTgbotUsersBlock,
  usePostApiTgbotUsersUnblock,
  usePostApiTgbotUsersSetAdmin,
  usePostApiTgbotUsersUnsetAdmin,
} from "../../api/orval/telegram-bot-user/telegram-bot-user.ts";
import "../../css/Table.css";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import { UserAvatar } from "../ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../../utils/readOptionalAvatarUrl.ts";

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
  const [tgUsersGridPage, setTgUsersGridPage] = useState(0);
  const [tgUsersPageSize, setTgUsersPageSize] = usePersistedPageSize(
    "telegram-bot-users",
    10,
    "5,10,20,50,100",
  );

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
      if (isBlocked) {
        await unblockUser(telegramId);
      } else {
        await blockUser(telegramId);
      }
      await refreshUsers();
    } finally {
      setMutationLoading(false);
    }
  };

  const handleToggleAdmin = async (telegramId: number, isAdmin: boolean) => {
    if (!telegramId) return;
    setMutationLoading(true);
    try {
      if (isAdmin) {
        await unsetAdmin(telegramId);
      } else {
        await setAdmin(telegramId);
      }
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
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "-";
        return {
          id,
          telegramId,
          username: u.username ?? "-",
          fullName,
          displayNameForAvatar: fullName !== "-" ? fullName : u.username ?? String(telegramId),
          avatarUrl: readOptionalAvatarUrl(u),
          createDate: u.createDate ? new Date(u.createDate).toLocaleString() : "-",
          lastUpdate: u.lastUpdate ? new Date(u.lastUpdate).toLocaleString() : "-",
          isAdmin: Boolean(u.isAdmin),
          isBlocked: Boolean(u.isBlocked),
        };
      }),
    [users]
  );

  const columns: GridColDef[] = [
    {
      field: "avatar",
      headerName: "",
      width: 56,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <UserAvatar
          src={params.row.avatarUrl as string | undefined}
          name={params.row.displayNameForAvatar as string}
          colorSeed={String(params.row.telegramId)}
          size={28}
        />
      ),
    },
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
        className="data-grid-wrap"
        style={{
          backgroundColor: "var(--bg-body)",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          paginationMode="client"
          paginationModel={{ page: tgUsersGridPage, pageSize: tgUsersPageSize }}
          onPaginationModelChange={(m) => {
            setTgUsersGridPage(m.page);
            setTgUsersPageSize(m.pageSize);
          }}
          localeText={{ noRowsLabel: "📭 No users found" }}
          loading={isGridLoading}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default TelegramBotUsersTable;
