// src/pages/TelegramBotSettings/useTelegramBotUsers.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useGetApiV2TgbotUsers,
} from "../../api/orval/telegram-bot-users-v2/telegram-bot-users-v2";
import type { GetApiV2TgbotUsersParams } from "../../api/orval/model/getApiV2TgbotUsersParams";
import type { TelegramBotUserResponsesGetTelegramBotUsersV2Response } from "../../api/orval/model/telegramBotUserResponsesGetTelegramBotUsersV2Response";

import type { TelegramBotUserDto } from "../../api/orvalModelShim";
import { useGridFilters } from "../../hooks/useGridFilterStub";
import { useServerGridPagination } from "../../hooks/useServerGridPagination";

/** ogmMutator unwraps ApiResponse.data at runtime; Orval types still use the Api* wrapper. */
function unwrapTgBotUsersV2(raw: unknown): TelegramBotUserResponsesGetTelegramBotUsersV2Response {
  return (raw ?? {}) as TelegramBotUserResponsesGetTelegramBotUsersV2Response;
}

export function useTelegramBotUsers() {
  const tgUserFilters = useGridFilters("settings-telegram-bot-users");
  const [rowCount, setRowCount] = useState(0);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const filterResetKey = useMemo(
    () => JSON.stringify(tgUserFilters.queryParams),
    [tgUserFilters.queryParams],
  );

  const paging = useServerGridPagination({
    storageKey: "telegram-bot-users",
    defaultPageSize: 10,
    allowedKey: "5,10,20,50,100",
    rowCount,
    resetKey: filterResetKey,
  });

  const params = useMemo<GetApiV2TgbotUsersParams>(
    () => ({
      ...tgUserFilters.queryParams,
      Page: paging.apiPage,
      PageSize: paging.pageSize,
    }),
    [tgUserFilters.queryParams, paging.apiPage, paging.pageSize],
  );

  const qUsers = useGetApiV2TgbotUsers(params, {
    query: { placeholderData: (prev) => prev },
  });

  const usersPage = unwrapTgBotUsersV2(qUsers.data).telegramBotUsers;

  useEffect(() => {
    if (typeof usersPage?.totalCount === "number") {
      setRowCount(usersPage.totalCount);
    }
  }, [usersPage?.totalCount]);

  const users: TelegramBotUserDto[] = useMemo(
    () => (usersPage?.items ?? []) as TelegramBotUserDto[],
    [usersPage?.items],
  );

  const handleRefresh = async () => {
    if (qUsers.isFetching || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await qUsers.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const anyLoading = qUsers.isLoading || qUsers.isFetching;
  const refreshing = manualRefreshing || qUsers.isFetching;

  const errorMessage =
    qUsers.error instanceof Error
      ? qUsers.error.message
      : qUsers.error
      ? "Failed to load Telegram bot users"
      : null;

  const onTgUserFilterApply = useCallback(() => {
    tgUserFilters.onApply();
    paging.resetPage();
  }, [tgUserFilters.onApply, paging.resetPage]);

  const onTgUserFilterReset = useCallback(() => {
    tgUserFilters.onReset();
    paging.resetPage();
  }, [tgUserFilters.onReset, paging.resetPage]);

  return {
    users,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
    tgUserFilterValues: tgUserFilters.values,
    onTgUserFilterChange: tgUserFilters.onChange,
    onTgUserFilterApply,
    onTgUserFilterReset,
    gridProps: paging.gridProps,
  };
}
