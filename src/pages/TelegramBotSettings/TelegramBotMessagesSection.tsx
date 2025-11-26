import { FaSync } from "react-icons/fa";
import TelegramBotMessagesTable from "./TelegramBotMessagesTable";
import type { MessageDto } from "../../api/orval/model";

import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function TelegramBotMessagesSection({
  messages,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
}: {
  messages: MessageDto[];
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
}) {
  console.log("[TgMessagesSection] messages.length =", messages.length);

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

      <TelegramBotMessagesTable messages={messages} loading={anyLoading} />
    </section>
  );
}
