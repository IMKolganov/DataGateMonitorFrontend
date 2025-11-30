// src/pages/TelegramBotSettings/TelegramBotUsersSection.tsx
import { FaSync } from "react-icons/fa";
import TelegramBotUsersTable from "../../components/TelegramBotUsersTable";
import type { TelegramBotUserDto } from "../../api/orval/model";

import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function TelegramBotUsersSection({
  users,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
}: {
  users: TelegramBotUserDto[];
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
}) {
  return (
    <>
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

      <TelegramBotUsersTable
        users={users}
        refreshUsers={handleRefresh}
        loading={anyLoading}
      />
    </>
  );
}
