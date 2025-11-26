import React, { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../../components/TableStyle";
import CustomThemeProvider from "../../components/ThemeProvider";
import "../../css/Table.css";

import type { MessageDto } from "../../api/orval/model";

interface TelegramBotMessagesTableProps {
  messages: MessageDto[];
  loading: boolean;
}

const TelegramBotMessagesTable: React.FC<TelegramBotMessagesTableProps> = ({
  messages,
  loading,
}) => {
  console.log("[TgMessagesTable] messages.length =", messages.length, "loading =", loading);

  const rows = useMemo(
    () =>
      (messages ?? []).map((m) => ({
        id: m.id ?? `${m.telegramId ?? "no-tg"}-${m.createDate ?? ""}`,

        telegramId: m.telegramId ?? null,
        username: m.username ?? "-",
        text: m.messageText ?? "",
        date: m.createDate
          ? new Date(m.createDate).toLocaleString()
          : m.createDate
          ? new Date(m.createDate).toLocaleString()
          : "-",
      })),
    [messages],
  );

  console.log("[TgMessagesTable] rows.length =", rows.length);

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
        style={{
          width: "100%",
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
          loading={loading}
          localeText={{
            noRowsLabel: "📭 No incoming messages",
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default TelegramBotMessagesTable;
