// src/pages/TelegramBotSettings/TelegramBotUsersSection.tsx
import { FaSync } from "react-icons/fa";
import TelegramBotUsersTable from "../../components/settings/TelegramBotUsersTable.tsx";
import { GridFilterBar } from "../../components/ui/GridFilterBar.tsx";
import { gridFilterFields } from "../../config/gridFilters.ts";
import type { TelegramBotUserDto } from "../../api/orvalModelShim";

import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function TelegramBotUsersSection({
  users,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
  tgUserFilterValues,
  onTgUserFilterChange,
  onTgUserFilterApply,
  onTgUserFilterReset,
}: {
  users: TelegramBotUserDto[];
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
  tgUserFilterValues: Record<string, string>;
  onTgUserFilterChange: (id: string, value: string) => void;
  onTgUserFilterApply: () => void;
  onTgUserFilterReset: () => void;
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

      <GridFilterBar
        gridId="settings-telegram-bot-users"
        fields={gridFilterFields("settings-telegram-bot-users")}
        values={tgUserFilterValues}
        onChange={onTgUserFilterChange}
        onApply={onTgUserFilterApply}
        onReset={onTgUserFilterReset}
        disabled={anyLoading}
      />

      <TelegramBotUsersTable
        users={users}
        refreshUsers={handleRefresh}
        loading={anyLoading}
      />
    </>
  );
}
