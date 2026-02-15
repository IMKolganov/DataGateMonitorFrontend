import { FaSync } from "react-icons/fa";
import UsersTable from "../../components/settings/UsersTable.tsx";
import type { UserDto } from "../../api/orval/model";
import type { GridPaginationModel } from "@mui/x-data-grid";
import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function UsersSection({
  users,
  totalCount,
  paginationModel,
  onPaginationModelChange,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
}: {
  users: UserDto[];
  totalCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
}) {
  return (
    <div>
      <div className="header-bar">
        <div className="left-buttons">
          <button type="button" className="btn secondary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {errorMessage && (
        <div>
          <p className="error-message">❌ {errorMessage}</p>
        </div>
      )}

      <UsersTable
        users={users}
        totalCount={totalCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        loading={anyLoading}
      />
    </div>
  );
}
