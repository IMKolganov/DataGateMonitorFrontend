// src/pages/TelegramBotSettings/TelegramBotMessagesTable.tsx
import React, { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Grid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import "../../css/Table.css";
import type { MessageDto } from "../../api/orvalModelShim";
import { truncateOneLine } from "../../utils/notifications/notificationMessageFormat";

/** Keep cells one-line — full message text + autoHeight freezes the settings page. */
export const TELEGRAM_MESSAGE_PREVIEW_LENGTH = 120;

interface TelegramBotMessagesTableProps {
    messages: MessageDto[];
    loading: boolean;
    page: number; // 0-based
    pageSize: number;
    totalMessages: number;
    onPaginationModelChange: (page: number, pageSize: number) => void;
}

const TelegramBotMessagesTable: React.FC<TelegramBotMessagesTableProps> = ({
    messages,
    loading,
    page,
    pageSize,
    totalMessages,
    onPaginationModelChange,
}) => {
    const rows = useMemo(
        () =>
            (messages ?? []).map((m) => {
                const fullText = m.messageText ?? "";
                return {
                    id: m.id ?? `${m.telegramId ?? "no-tg"}-${m.createDate ?? ""}`,
                    telegramId: m.telegramId ?? null,
                    username: m.username ?? "-",
                    text: truncateOneLine(fullText, TELEGRAM_MESSAGE_PREVIEW_LENGTH),
                    textFull: fullText,
                    date: m.createDate ? new Date(m.createDate).toLocaleString() : "-",
                };
            }),
        [messages],
    );

    const columns: GridColDef[] = useMemo(
        () => [
            { field: "id", headerName: "ID", width: 70 },
            { field: "telegramId", headerName: "Telegram ID", flex: 0.8 },
            { field: "username", headerName: "Username", flex: 1 },
            {
                field: "text",
                headerName: "Message",
                flex: 2,
                renderCell: (params) => (
                    <span
                        title={String(params.row.textFull ?? "")}
                        style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                        }}
                    >
                        {String(params.value ?? "")}
                    </span>
                ),
            },
            { field: "date", headerName: "Date", flex: 1 },
        ],
        [],
    );

    return (
        <CustomThemeProvider>
            <div
                className="data-grid-wrap data-grid-wrap--viewport"
                style={{
                    backgroundColor: "var(--bg-body)",
                    padding: "10px",
                    borderRadius: "8px",
                }}
            >
                <Grid
                    gridId="telegram-bot-messages"
                    rows={rows}
                    columns={columns}
                    autoHeight={false}
                    paginationMode="server"
                    rowCount={totalMessages}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        onPaginationModelChange(model.page, model.pageSize);
                    }}
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    loading={loading}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    localeText={{ noRowsLabel: "📭 No incoming messages" }}
                />
            </div>
        </CustomThemeProvider>
    );
};

export default TelegramBotMessagesTable;
