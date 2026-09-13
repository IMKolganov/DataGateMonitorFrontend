import { Link } from "react-router-dom";
import { FaChartPie, FaUsers } from "react-icons/fa";
import { useUsers } from "./useUsers";
import { UsersSection } from "./UsersSection";

export function UsersSettings() {
  const {
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
  } = useUsers({ mode: "datagrid" });

  return (
    <div>
      <div className="page-header-row">
        <h2 className="settings-page__h2-with-icon settings-page__h2-with-icon--flush">
          <FaUsers className="icon" aria-hidden />
          <span>Users</span>
        </h2>
        <Link to="/settings/users/quotas" className="btn secondary">
          <FaChartPie className="icon" /> User quotas
        </Link>
      </div>
      <div className="settings-divider" />
      <p className="app-settings-description">
        Filter users below. Each row shows traffic quota usage and VPN servers available to that person
        (quota plan allowlist plus personal grants/blocks). Open a user for full details.
      </p>

      <UsersSection
        users={users}
        totalCount={totalCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        anyLoading={anyLoading}
        refreshing={refreshing}
        errorMessage={errorMessage}
        handleRefresh={handleRefresh}
        userFilterValues={userFilterValues}
        onUserFilterChange={onUserFilterChange}
        onUserFilterApply={onUserFilterApply}
        onUserFilterReset={onUserFilterReset}
      />
    </div>
  );
}

export default UsersSettings;
