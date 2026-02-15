// src/pages/TelegramBotSettings/TelegramBotMessagesSection.tsx
import { FaSync } from "react-icons/fa";
import TelegramBotMessagesTable from "./TelegramBotMessagesTable";
import type { MessageDto } from "../../api/orval/model";

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
                                           }: Props) {
    return (
        <section style={{ marginTop: "24px" }}>
            <h3>Incoming Messages</h3>
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
