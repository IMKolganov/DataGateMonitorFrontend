// src/pages/TelegramBotSettings/useTelegramBotMessages.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";

import {
    useGetApiTgbotIncomingMessageLogsGetAll,
} from "../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log";

import type {
    GetAllMessagesResponse,
    MessageDto,
    GetApiTgbotIncomingMessageLogsGetAllParams,
} from "../../api/orval/model";
import { isCanceledError } from "../../utils/queryCanceled";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";

export function useTelegramBotMessages() {
    // MUI DataGrid — 0-based
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = usePersistedPageSize(
        "telegram-bot-incoming-messages",
        10,
        "5,10,20,50,100",
    );
    const [totalCount, setTotalCount] = useState(0);
    const [manualRefreshing, setManualRefreshing] = useState(false);

    const params = useMemo<GetApiTgbotIncomingMessageLogsGetAllParams>(
        () => ({
            Page: page + 1, // backend 1-based
            PageSize: pageSize,
        }),
        [page, pageSize],
    );

    const qMessages = useGetApiTgbotIncomingMessageLogsGetAll(params, {
        query: {
            placeholderData: keepPreviousData,
        },
    });

    const messages: MessageDto[] = useMemo(() => {
        const raw = qMessages.data as GetAllMessagesResponse | undefined;
        const envelope = raw?.messages;
        const items = envelope?.items ?? [];
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
        isCanceledError(qMessages.error)
            ? null
            : qMessages.error instanceof Error
                ? qMessages.error.message
                : qMessages.error
                    ? "Failed to load Telegram bot incoming messages"
                    : null;

    const onPaginationModelChange = useCallback(
        (newPage: number, newPageSize: number) => {
            setPage((prevPage) => (prevPage !== newPage ? newPage : prevPage));
            setPageSize(newPageSize);
        },
        [setPageSize],
    );

    return {
        messages,
        totalCount,
        page,
        pageSize,
        onPaginationModelChange,
        anyLoading,
        refreshing,
        errorMessage,
        handleRefresh,
    };
}
