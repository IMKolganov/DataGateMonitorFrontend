// src/components/OverviewUsersTable.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Link, useParams } from "react-router-dom";
import { FaUsers } from "react-icons/fa";
import Grid from "./ui/TableStyle.tsx";
import CustomThemeProvider from "./ui/ThemeProvider.tsx";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import "../css/Table.css";
import "../css/Settings.css";
import { errorMessage } from "../utils/errorMessage";

import {
  useGetApiV2VpnSessionsOverviewUsersPaged,
} from "../api/orval/vpn-server-clients/vpn-server-clients";
import type { GetApiV2VpnSessionsOverviewUsersPagedParams } from "../api/orval/model/getApiV2VpnSessionsOverviewUsersPagedParams";
import type { VpnServerClientsResponsesOverviewUsersV2Response } from "../api/orval/model/vpnServerClientsResponsesOverviewUsersV2Response";
import { useGetApiUsersGetAll } from "../api/orval/user/user";
import { useServerGridPagination } from "../hooks/useServerGridPagination";
import { UserAvatar } from "./ui/UserAvatar.tsx";
import { GridFilterBar } from "./ui/GridFilterBar.tsx";
import { gridFilterFields } from "../config/gridFilters.ts";
import { useGridFilters } from "../hooks/useGridFilterStub.ts";
import { readOptionalAvatarUrl } from "../utils/readOptionalAvatarUrl.ts";
import { parseTelegramNumericId } from "../utils/telegramNumericId.ts";
import { telegramPhotoTelegramIdIfCached } from "../api/telegramProfilePhotoIndex.ts";
import { useTelegramProfilePhotoIndex } from "../hooks/useTelegramProfilePhotoIndex.ts";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors.ts";
import { unwrapMaybeApiResponse } from "../pages/TelegramBotSettings/unwrapApiResponse";
import type { ApiEnvelope } from "../pages/TelegramBotSettings/unwrapApiResponse";

import type {
  GetAllUsersResponse,
  OverviewUserDto,
  UserDto,
} from "../api/orvalModelShim";

/** ogmMutator unwraps ApiResponse.data at runtime; Orval types still use the Api* wrapper. */
function unwrapOverviewUsersV2(raw: unknown): VpnServerClientsResponsesOverviewUsersV2Response {
  return (raw ?? {}) as VpnServerClientsResponsesOverviewUsersV2Response;
}

export interface OverviewUsersTableProps {
  from: Date;
  to: Date;
  vpnServerId?: number | null;
  externalId?: string | null;
  currentUserExternalId?: string | null;
}

export const OverviewUsersTable: React.FC<OverviewUsersTableProps> = ({
  from,
  to,
  vpnServerId,
  externalId,
  currentUserExternalId,
}) => {
  const { vpnServerId: vpnServerIdFromRoute } = useParams<{ vpnServerId: string }>();
  const currentUser = getCurrentUser();
  const canLinkToUserStats = isAdmin(currentUser);
  const normalizedCurrentUserExternalId = (currentUserExternalId ?? "").trim();
  const currentUserDisplayName = (currentUser?.displayName ?? currentUser?.email ?? "").trim();

  const overviewStorageKey = useMemo(
    () =>
      `overview-users:${vpnServerId != null ? String(vpnServerId) : vpnServerIdFromRoute ?? "all"}`,
    [vpnServerId, vpnServerIdFromRoute],
  );
  const [rowCount, setRowCount] = useState(0);
  const overviewUserFilters = useGridFilters("overview-users");

  const filterResetKey = useMemo(
    () =>
      JSON.stringify({
        from: from.toISOString(),
        to: to.toISOString(),
        vpnServerId,
        externalId: externalId?.trim() || undefined,
        filters: overviewUserFilters.queryParams,
      }),
    [from, to, vpnServerId, externalId, overviewUserFilters.queryParams],
  );

  const paging = useServerGridPagination({
    storageKey: overviewStorageKey,
    defaultPageSize: 10,
    allowedKey: "5,10,20,50,100",
    rowCount,
    resetKey: filterResetKey,
  });

  const queryParams = useMemo<GetApiV2VpnSessionsOverviewUsersPagedParams>(() => {
    return {
      From: from.toISOString(),
      To: to.toISOString(),
      VpnServerId: vpnServerId ?? undefined,
      ExternalId: externalId?.trim() || undefined,
      ...overviewUserFilters.queryParams,
      Page: paging.apiPage,
      PageSize: paging.pageSize,
    };
  }, [
    from,
    to,
    vpnServerId,
    externalId,
    overviewUserFilters.queryParams,
    paging.apiPage,
    paging.pageSize,
  ]);

  const onOverviewFilterApply = () => {
    overviewUserFilters.onApply();
    paging.resetPage();
  };

  const onOverviewFilterReset = () => {
    overviewUserFilters.onReset();
    paging.resetPage();
  };

  const { data, isFetching, isError, error } = useGetApiV2VpnSessionsOverviewUsersPaged(
    queryParams,
    {
      query: {
        enabled: Boolean(queryParams.From && queryParams.To),
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 1,
        placeholderData: (prev) => prev,
      },
    },
  );

  const usersQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 500 },
    { query: { enabled: canLinkToUserStats, staleTime: 60_000 } },
  );

  const { index: telegramPhotoIndex } = useTelegramProfilePhotoIndex(true);

  const usersPage = unwrapOverviewUsersV2(data).users;

  useEffect(() => {
    if (typeof usersPage?.totalCount === "number") {
      setRowCount(usersPage.totalCount);
    }
  }, [usersPage?.totalCount]);

  const items: OverviewUserDto[] = useMemo(
    () => (usersPage?.items ?? []) as OverviewUserDto[],
    [usersPage?.items],
  );

  const avatarByExternalId = useMemo(() => {
    const payload = unwrapMaybeApiResponse<GetAllUsersResponse>(
      usersQuery.data as GetAllUsersResponse | ApiEnvelope<GetAllUsersResponse> | undefined,
    );
    const users = (payload?.users ?? []) as UserDto[];
    const map = new Map<string, string>();
    for (const u of users) {
      const extId = (u.externalId ?? "").trim();
      const avatar = readOptionalAvatarUrl(u);
      if (!extId || !avatar) continue;
      map.set(extId, avatar);
    }
    return map;
  }, [usersQuery.data]);

  const rows = useMemo(() => {
    return items.map((u, index) => {
      const rowExternalId = (u.externalId ?? "").trim();
      const isCurrentUserRow =
        normalizedCurrentUserExternalId.length > 0 &&
        rowExternalId === normalizedCurrentUserExternalId;
      const displayName =
        isCurrentUserRow && currentUserDisplayName
          ? currentUserDisplayName
          : (u.displayName ?? "");
      const externalId = isCurrentUserRow
        ? normalizedCurrentUserExternalId
        : (u.externalId ?? "");
      const firstSeen = u.firstSeen ? formatDateWithOffset(new Date(u.firstSeen)) : "";
      const lastSeen  = u.lastSeen  ? formatDateWithOffset(new Date(u.lastSeen))  : "";
      return {
        id: `${externalId || "unknown"}_${u.vpnServerId ?? "mixed"}_${index}`,
        displayName,
        displayNameForAvatar: displayName || externalId || "",
        avatarUrl:
          readOptionalAvatarUrl(u) ??
          avatarByExternalId.get(externalId.trim()) ??
          undefined,
        telegramPhotoTelegramId: telegramPhotoTelegramIdIfCached(
          parseTelegramNumericId(externalId || undefined),
          telegramPhotoIndex,
        ),
        externalId,
        isCurrentUser: isCurrentUserRow,
        vpnServerId: u.vpnServerId ?? null,
        sessions: u.sessions,
        trafficIn: formatBytes(u.trafficInBytes),
        trafficOut: formatBytes(u.trafficOutBytes),
        trafficTotal: formatBytes(u.trafficTotalBytes),
        firstSeen,
        lastSeen,
      };
    });
  }, [items, avatarByExternalId, currentUserDisplayName, normalizedCurrentUserExternalId, telegramPhotoIndex]);

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
          colorSeed={`${params.row.externalId}|${params.row.displayName}`}
          size={28}
        />
      ),
    },
    {
      field: "externalId",
      headerName: "External Id",
      flex: 0.3,
      renderCell: (params) => {
        const extId = params.value as string;
        if (!extId) return null;

        const rowServerId = (params.row?.vpnServerId as number | null) ?? null;
        const routeServerId = vpnServerIdFromRoute ? Number(vpnServerIdFromRoute) : null;
        const serverIdForLink = rowServerId ?? routeServerId;

        if (!canLinkToUserStats) {
          return (
            <span>
              {extId}
              {params.row?.isCurrentUser ? " (you)" : ""}
            </span>
          );
        }

        const url = serverIdForLink
          ? `/servers/${serverIdForLink}/statistics/${encodeURIComponent(extId)}`
          : `/servers/statistics/${encodeURIComponent(extId)}`;

        return (
          <Link to={url} className="link-accent">
            {extId}
            {params.row?.isCurrentUser ? " (you)" : ""}
          </Link>
        );
      },
    },
    { field: "displayName", headerName: "Display Name", flex: 0.45 },
    {
      field: "vpnServerId",
      headerName: "Server",
      flex: 0.2,
      renderCell: (p) => (p.value == null ? "mixed" : String(p.value)),
    },
    { field: "sessions", headerName: "Sessions", flex: 0.26 },
    { field: "trafficIn", headerName: "Traffic In", flex: 0.4 },
    { field: "trafficOut", headerName: "Traffic Out", flex: 0.4 },
    { field: "trafficTotal", headerName: "Total Traffic", flex: 0.3 },
    { field: "firstSeen", headerName: "First Seen", flex: 0.7 },
    { field: "lastSeen", headerName: "Last Seen", flex: 0.7 },
  ];

  return (
    <div className="full-width-min-0">
      <h3 className="settings-card__h3-with-icon">
        <FaUsers className="icon" aria-hidden />
        <span>Users in Selection</span>
      </h3>
      <GridFilterBar
        gridId="overview-users"
        fields={gridFilterFields("overview-users")}
        values={overviewUserFilters.values}
        onChange={overviewUserFilters.onChange}
        onApply={onOverviewFilterApply}
        onReset={onOverviewFilterReset}
      />
      <CustomThemeProvider>
        <div className="data-grid-wrap data-grid-wrap--inset">
          <Grid
            gridId="overview-users"
            rows={rows}
            columns={columns}
            {...paging.gridProps}
            loading={isFetching}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{
              noRowsLabel: isError
                ? `❗ ${error ? errorMessage(error) : "Failed to load users"}`
                : "📭 No users in selection",
            }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
};
