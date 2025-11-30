// src/pages/TelegramBotSettings/useTelegramBotMessages.ts
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";

import {
    useGetApiTgbotIncomingMessageLogsGetAll,
} from "../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log";

import type {
    GetAllMessagesResponse,
    MessageDto,
    GetApiTgbotIncomingMessageLogsGetAllParams,
} from "../../api/orval/model";

export function useTelegramBotMessages() {
    // MUI DataGrid — 0-based
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [manualRefreshing, setManualRefreshing] = useState(false);

    const params: GetApiTgbotIncomingMessageLogsGetAllParams = {
        Page: page + 1,     // backend 1-based
        PageSize: pageSize,
    };

    const qMessages = useGetApiTgbotIncomingMessageLogsGetAll(params, {
        query: {
            placeholderData: keepPreviousData,
        },
    });

    console.log("[TgMessagesHook] params sent to API:", params);

    const messages: MessageDto[] = useMemo(() => {
        const raw = qMessages.data as GetAllMessagesResponse | undefined;
        const envelope = raw?.messages;

        const items = envelope?.items ?? [];

        console.log("[TgMessagesHook] response meta:", {
            serverPage: envelope?.page,
            serverPageSize: envelope?.pageSize,
            totalCount: envelope?.totalCount,
            itemsLen: items.length,
        });

        return items as MessageDto[];
    }, [qMessages.data]);

    useEffect(() => {
        const raw = qMessages.data as GetAllMessagesResponse | undefined;
        const envelope = raw?.messages;

        if (envelope) {
            const total = envelope.totalCount ?? envelope.items?.length ?? 0;
            setTotalCount(total);
        }
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

    return {
        messages,
        totalCount,
        page,
        pageSize,
        setPage,
        setPageSize,
        anyLoading,
        refreshing,
        errorMessage,
        handleRefresh,
    };
}
