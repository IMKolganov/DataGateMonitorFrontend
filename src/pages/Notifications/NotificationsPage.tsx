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
      <h2>Notifications</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }} />
      <p className="app-settings-description">
        Notifications for the current user. Mark as read when done.
      </p>

      <NotificationsSection
        notifications={notifications}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPaginationModelChange={onPaginationModelChange}
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
