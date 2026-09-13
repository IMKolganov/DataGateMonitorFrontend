import React, { useMemo } from "react";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { FaEye } from "react-icons/fa";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { UserDto } from "../../api/orvalModelShim";
import { GridRowActions, RowActionLink } from "../ui/GridRowActions.tsx";
import { UserTrafficQuotaProgress } from "../quota/UserTrafficQuotaProgress";
import { UserAvailableServersChips } from "../quota/UserAvailableServersChips";
import "../../css/Table.css";
import { UserAvatar } from "../ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../../utils/readOptionalAvatarUrl.ts";
import { telegramPhotoIdForProvider } from "../../utils/telegramNumericId.ts";

interface UsersTableProps {
  users: UserDto[];
  totalCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  loading: boolean;
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  totalCount,
  paginationModel,
  onPaginationModelChange,
  loading,
}) => {
  const rows = useMemo(
    () =>
      (users ?? []).map((u, idx) => {
        const id = u.id ?? idx + 1;
        return {
          id,
          displayName: u.displayName ?? "-",
          displayNameForAvatar: u.displayName ?? u.email ?? "-",
          avatarUrl: readOptionalAvatarUrl(u),
          telegramPhotoTelegramId: telegramPhotoIdForProvider(u.provider, u.externalId),
          email: u.email ?? "-",
          provider: u.provider ?? "-",
          externalId: u.externalId ?? "-",
          createDate: u.createDate ? new Date(u.createDate).toLocaleString() : "-",
          lastUpdate: u.lastUpdate ? new Date(u.lastUpdate).toLocaleString() : "-",
          isAdmin: Boolean(u.isAdmin),
          isBlocked: Boolean(u.isBlocked),
          hasDashboardAccess: Boolean(u.hasDashboardAccess),
          externalIdRaw: u.externalId,
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
          telegramPhotoTelegramId={params.row.telegramPhotoTelegramId as number | undefined}
          name={params.row.displayNameForAvatar as string}
          colorSeed={`${params.row.id}|${params.row.email}`}
          size={28}
        />
      ),
    },
    { field: "id", headerName: "ID", width: 70 },
    { field: "displayName", headerName: "Display Name", flex: 1, minWidth: 120 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 140 },
    {
      field: "quota",
      headerName: "Quota",
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="users-table-quota-cell">
          <UserTrafficQuotaProgress
            userId={params.row.id as number}
            externalId={params.row.externalIdRaw as string | null | undefined}
            compact
            suppressInlineTitle
          />
        </div>
      ),
    },
    {
      field: "servers",
      headerName: "Available servers",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <UserAvailableServersChips userId={params.row.id as number} compact />
      ),
    },
    { field: "provider", headerName: "Provider", flex: 0.7, minWidth: 90 },
    { field: "isAdmin", headerName: "Admin", type: "boolean", width: 80 },
    { field: "isBlocked", headerName: "Blocked", type: "boolean", width: 90 },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <GridRowActions>
          <RowActionLink
            to={`/settings/users/${params.row.id}`}
            title="View"
            onClick={(e) => e.stopPropagation()}
            icon={<FaEye className="icon" />}
          />
        </GridRowActions>
      ),
    },
  ];

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
        <Grid
          gridId="settings-users"
          rows={rows}
          columns={columns}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          getRowHeight={() => "auto"}
          localeText={{ noRowsLabel: "📭 No users found" }}
          loading={loading}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          sx={{
            "& .MuiDataGrid-cell": {
              alignItems: "center",
              py: 1,
            },
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default UsersTable;
