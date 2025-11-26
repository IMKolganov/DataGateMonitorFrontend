import { useMemo, useState } from "react";
import {
  useGetApiTgbotIncomingMessageLogsGetAll,
} from "../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log";

import type {
  GetAllMessagesResponse,
  MessageDto,
} from "../../api/orval/model";

export function useTelegramBotMessages() {
  // ogmMutator уже разворачивает ApiResponse, поэтому data = GetAllMessagesResponse | undefined
  const qMessages = useGetApiTgbotIncomingMessageLogsGetAll(undefined);

  const [manualRefreshing, setManualRefreshing] = useState(false);

  const messages: MessageDto[] = useMemo(() => {
    const raw = qMessages.data as GetAllMessagesResponse | undefined;

    const items = raw?.messages?.items ?? [];

    console.log("[TgMessages] raw:", raw);
    console.log("[TgMessages] items.length:", items.length);

    return items;
  }, [qMessages.data]);

  const handleRefresh = async () => {
    if (qMessages.isFetching || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await qMessages.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const anyLoading = qMessages.isLoading || qMessages.isFetching;
  const refreshing = manualRefreshing || qMessages.isFetching;

  const errorMessage =
    qMessages.error instanceof Error
      ? qMessages.error.message
      : qMessages.error
      ? "Failed to load Telegram bot incoming messages"
      : null;

  if (errorMessage) {
    console.error("[TgMessages] error:", qMessages.error);
  }

  return {
    messages,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  };
}
