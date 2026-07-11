import { FaSync } from "react-icons/fa";
import UsersTable from "../../components/settings/UsersTable.tsx";
import { GridFilterBar } from "../../components/ui/GridFilterBar.tsx";
import { gridFilterFields } from "../../config/gridFilters.ts";
import type { UserDto } from "../../api/orvalModelShim";
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
  userFilterValues,
  onUserFilterChange,
  onUserFilterApply,
  onUserFilterReset,
}: {
  users: UserDto[];
  totalCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
  userFilterValues: Record<string, string>;
  onUserFilterChange: (id: string, value: string) => void;
  onUserFilterApply: () => void;
  onUserFilterReset: () => void;
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

      <GridFilterBar
        gridId="settings-users"
        fields={gridFilterFields("settings-users")}
        values={userFilterValues}
        onChange={onUserFilterChange}
        onApply={onUserFilterApply}
        onReset={onUserFilterReset}
        disabled={anyLoading}
      />

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
