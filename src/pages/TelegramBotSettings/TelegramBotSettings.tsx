// src/pages/TelegramBotSettings/TelegramBotSettings.tsx
import { FaTelegram } from "react-icons/fa";
import { useTelegramBotUsers } from "./useTelegramBotUsers";
import { TelegramBotUsersSection } from "./TelegramBotUsersSection";
import { TelegramBotInfoBlock } from "./TelegramBotInfoBlock";
import { useTelegramBotMessages } from "./useTelegramBotMessages";
import { TelegramBotMessagesSection } from "./TelegramBotMessagesSection";

export function TelegramBotSettings() {
    const {
        users,
        anyLoading: usersLoading,
        refreshing: usersRefreshing,
        errorMessage: usersError,
        handleRefresh: refreshUsers,
    } = useTelegramBotUsers();

    const {
        messages,
        totalCount,
        page,
        pageSize,
        onPaginationModelChange,
        anyLoading: messagesLoading,
        refreshing: messagesRefreshing,
        errorMessage: messagesError,
        handleRefresh: refreshMessages,
    } = useTelegramBotMessages();

    return (
        <div>
            <h2 className="settings-page__h2-with-icon">
              <FaTelegram className="icon" aria-hidden />
              <span>Telegram Bot Settings</span>
            </h2>
            <div className="settings-divider" />

            <p className="app-settings-description">
                View the list of users who interacted with your Telegram bot and inspect their messages.
            </p>

            <TelegramBotUsersSection
                users={users}
                anyLoading={usersLoading}
                refreshing={usersRefreshing}
                errorMessage={usersError}
                handleRefresh={refreshUsers}
            />

            <TelegramBotMessagesSection
                messages={messages}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                onPaginationModelChange={onPaginationModelChange}
                anyLoading={messagesLoading}
                refreshing={messagesRefreshing}
                errorMessage={messagesError}
                handleRefresh={refreshMessages}
            />

            <TelegramBotInfoBlock />
        </div>
    );
}
