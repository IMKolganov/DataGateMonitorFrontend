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
  } = useUsers({ mode: "datagrid" });

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 className="settings-page__h2-with-icon" style={{ margin: 0 }}>
          <FaUsers className="icon" aria-hidden />
          <span>Users</span>
        </h2>
        <Link to="/settings/users/quotas" className="btn secondary">
          <FaChartPie className="icon" /> User quotas
        </Link>
      </div>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <p className="app-settings-description">
        List of application users. Open a user to see profile, traffic vs quota usage, and plan assignments.
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
      />
    </div>
  );
}

export default UsersSettings;
