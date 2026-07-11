// src/pages/TelegramBotSettings/useTelegramBotUsers.ts
import { useCallback, useMemo, useState } from "react";
import {
  useGetApiTgbotUsersGetAll
} from "../../api/orval/telegram-bot-user/telegram-bot-user";
import type { GetApiTgbotUsersGetAllParams } from "../../api/orval/model/getApiTgbotUsersGetAllParams";

import type {
  GetAllTelegramUsersResponse,
  TelegramBotUserDto,
} from "../../api/orvalModelShim";

import type { ApiEnvelope } from "./unwrapApiResponse";
import { unwrapMaybeApiResponse } from "./unwrapApiResponse";
import { useGridFilters } from "../../hooks/useGridFilterStub";

export function useTelegramBotUsers() {
  const tgUserFilters = useGridFilters("settings-telegram-bot-users");

  const params = useMemo<GetApiTgbotUsersGetAllParams>(
    () => ({ ...tgUserFilters.queryParams }),
    [tgUserFilters.queryParams],
  );

  const qUsers = useGetApiTgbotUsersGetAll(params);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const users: TelegramBotUserDto[] = useMemo(() => {
    const payload = unwrapMaybeApiResponse<GetAllTelegramUsersResponse>(
      qUsers.data as GetAllTelegramUsersResponse | ApiEnvelope<GetAllTelegramUsersResponse> | undefined,
    );
    return (payload?.telegramBotUsers ?? []) as TelegramBotUserDto[];
  }, [qUsers.data]);

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
  }, [tgUserFilters.onApply]);

  const onTgUserFilterReset = useCallback(() => {
    tgUserFilters.onReset();
  }, [tgUserFilters.onReset]);

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
  };
}
