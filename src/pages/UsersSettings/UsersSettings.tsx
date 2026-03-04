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
  } = useUsers();

  return (
    <div>
      <h2>Users</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <p className="app-settings-description">
        List of application users.
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
