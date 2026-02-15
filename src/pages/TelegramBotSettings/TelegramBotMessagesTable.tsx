// src/pages/TelegramBotSettings/TelegramBotMessagesTable.tsx
import React, { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import "../../css/Table.css";
import type { MessageDto } from "../../api/orval/model";

interface TelegramBotMessagesTableProps {
    messages: MessageDto[];
    loading: boolean;

    page: number;              // 0-based
    pageSize: number;
    totalMessages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const TelegramBotMessagesTable: React.FC<TelegramBotMessagesTableProps> = ({
                                                                               messages,
                                                                               loading,
                                                                               page,
                                                                               pageSize,
                                                                               totalMessages,
                                                                               onPageChange,
                                                                               onPageSizeChange,
                                                                           }) => {
    console.log("[TgMessagesTable] render", {
        page,
        pageSize,
        totalMessages,
        messagesLen: messages.length,
    });

    const rows = useMemo(
        () =>
            (messages ?? []).map((m) => ({
                id: m.id ?? `${m.telegramId ?? "no-tg"}-${m.createDate ?? ""}`,
                telegramId: m.telegramId ?? null,
                username: m.username ?? "-",
                text: m.messageText ?? "",
                date: m.createDate ? new Date(m.createDate).toLocaleString() : "-",
            })),
        [messages],
    );

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "telegramId", headerName: "Telegram ID", flex: 0.8 },
        { field: "username", headerName: "Username", flex: 1 },
        { field: "text", headerName: "Message", flex: 2 },
        { field: "date", headerName: "Date", flex: 1 },
    ];

    return (
        <CustomThemeProvider>
            <div
                className="data-grid-wrap"
                style={{
                    backgroundColor: "#0d1117",
                    padding: "10px",
                    borderRadius: "8px",
                }}
            >
                <StyledDataGrid
                    rows={rows}
                    columns={columns}
                    paginationMode="server"
                    rowCount={totalMessages}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        console.log("[TgMessagesTable] onPaginationModelChange", model);
                        onPageChange(model.page);
                        onPageSizeChange(model.pageSize);
                    }}
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    loading={loading}
                    disableColumnFilter
                    disableColumnMenu
                    localeText={{ noRowsLabel: "📭 No incoming messages" }}
                />
            </div>
        </CustomThemeProvider>
    );
};

export default TelegramBotMessagesTable;
