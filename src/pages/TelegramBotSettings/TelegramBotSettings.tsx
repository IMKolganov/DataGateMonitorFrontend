// src/pages/TelegramBotSettings/TelegramBotSettings.tsx
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
    anyLoading: messagesLoading,
    refreshing: messagesRefreshing,
    errorMessage: messagesError,
    handleRefresh: refreshMessages,
  } = useTelegramBotMessages();

  return (
    <div>
      <h2>Telegram Bot Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>

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
        anyLoading={messagesLoading}
        refreshing={messagesRefreshing}
        errorMessage={messagesError}
        handleRefresh={refreshMessages}
      />

      <TelegramBotInfoBlock />
    </div>
  );
}

export default TelegramBotSettings;
