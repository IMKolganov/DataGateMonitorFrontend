// src/pages/TelegramBotSettings/useTelegramBotUsers.ts
import { useMemo, useState } from "react";
import {
  useGetApiTgbotUsersGetAll
} from "../../api/orval/telegram-bot-user/telegram-bot-user";

import type {
  GetAllTelegramUsersResponse,
  TelegramBotUserDto,
} from "../../api/orval/model";

import type { ApiEnvelope } from "./unwrapApiResponse";
import { unwrapMaybeApiResponse } from "./unwrapApiResponse";

export function useTelegramBotUsers() {
  const qUsers = useGetApiTgbotUsersGetAll();
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

  return {
    users,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  };
}
