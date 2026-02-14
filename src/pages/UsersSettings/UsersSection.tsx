import { FaSync } from "react-icons/fa";
import UsersTable from "../../components/settings/UsersTable.tsx";
import type { UserDto } from "../../api/orval/model";
import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function UsersSection({
  users,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
}: {
  users: UserDto[];
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

      <UsersTable users={users} loading={anyLoading} />
    </>
  );
}
