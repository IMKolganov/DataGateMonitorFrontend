import { FaBell } from "react-icons/fa";
import { useNotifications } from "./useNotifications";
import { NotificationsSection } from "./NotificationsSection";
import { isAdmin } from "../../utils/auth/authSelectors";
import { getCurrentUser } from "../../utils/auth/authSelectors";
import "../../css/Settings.css";
import "../../css/ApplicationSettings.css";

export function NotificationsPage() {
  const {
    notifications,
    totalCount,
    page,
    pageSize,
    onPaginationModelChange,
    readFilter,
    setReadFilter,
    typeFilter,
    setTypeFilter,
    severityEnabled,
    toggleSeverity,
    anyLoading,
    refreshing,
    errorMessage,
    refresh,
    markRead,
    markReadAll,
    sendTestNotification,
    adminUserId,
    markReadLoading,
    markReadAllLoading,
    sendTestLoading,
  } = useNotifications();

  const user = getCurrentUser();
  const showSendTest = isAdmin(user) && Boolean(adminUserId);

  return (
    <div className="content-wrapper wide-table settings">
      <h2 className="settings-page__h2-with-icon">
        <FaBell className="icon" aria-hidden />
        <span>Notifications</span>
      </h2>
      <div className="settings-divider" />
      <p className="app-settings-description">
        Notifications for the current user. Mark as read when done.
      </p>

      <NotificationsSection
        notifications={notifications}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPaginationModelChange={onPaginationModelChange}
        readFilter={readFilter}
        onReadFilterChange={setReadFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        severityEnabled={severityEnabled}
        onToggleSeverity={toggleSeverity}
        anyLoading={anyLoading}
        refreshing={refreshing}
        errorMessage={errorMessage}
        handleRefresh={refresh}
        onMarkRead={markRead}
        markReadLoading={markReadLoading}
        onMarkReadAll={markReadAll}
        markReadAllLoading={markReadAllLoading}
        onSendTest={() => sendTestNotification()}
        sendTestLoading={sendTestLoading}
        showSendTest={showSendTest}
      />
    </div>
  );
}

export default NotificationsPage;
