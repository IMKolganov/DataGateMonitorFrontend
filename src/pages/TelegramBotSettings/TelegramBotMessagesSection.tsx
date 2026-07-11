// src/pages/TelegramBotSettings/TelegramBotMessagesSection.tsx
import { FaInbox, FaSync } from "react-icons/fa";
import TelegramBotMessagesTable from "./TelegramBotMessagesTable";
import { GridFilterBar } from "../../components/ui/GridFilterBar.tsx";
import { gridFilterFields } from "../../config/gridFilters.ts";
import type { MessageDto } from "../../api/orvalModelShim";

import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

interface Props {
    messages: MessageDto[];
    totalCount: number;
    page: number;
    pageSize: number;
    onPaginationModelChange: (page: number, pageSize: number) => void;
    anyLoading: boolean;
    refreshing: boolean;
    errorMessage: string | null;
    handleRefresh: () => void;
    messageFilterValues: Record<string, string>;
    onMessageFilterChange: (id: string, value: string) => void;
    onMessageFilterApply: () => void;
    onMessageFilterReset: () => void;
}

export function TelegramBotMessagesSection({
                                               messages,
                                               totalCount,
                                               page,
                                               pageSize,
                                               onPaginationModelChange,
                                               anyLoading,
                                               refreshing,
                                               errorMessage,
                                               handleRefresh,
                                               messageFilterValues,
                                               onMessageFilterChange,
                                               onMessageFilterApply,
                                               onMessageFilterReset,
                                           }: Props) {
    return (
        <section style={{ marginTop: "24px" }}>
            <h3 className="settings-card__h3-with-icon">
              <FaInbox className="icon" aria-hidden />
              <span>Incoming Messages</span>
            </h3>
            <p className="app-settings-description">
                View all messages sent by users to your Telegram bot.
            </p>

            <div className="header-bar">
                <div className="left-buttons">
                    <button className="btn secondary" onClick={handleRefresh} disabled={refreshing}>
                        <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div>
                    <p className="error-message">❌ {errorMessage}</p>
                </div>
            )}

            <GridFilterBar
                gridId="settings-telegram-bot-messages"
                fields={gridFilterFields("settings-telegram-bot-messages")}
                values={messageFilterValues}
                onChange={onMessageFilterChange}
                onApply={onMessageFilterApply}
                onReset={onMessageFilterReset}
                disabled={anyLoading}
            />

            <TelegramBotMessagesTable
                messages={messages}
                loading={anyLoading}
                page={page}
                pageSize={pageSize}
                totalMessages={totalCount}
                onPaginationModelChange={onPaginationModelChange}
            />
        </section>
    );
}
