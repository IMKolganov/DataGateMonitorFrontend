import { FaBell, FaSync } from "react-icons/fa";
import NotificationsTable from "../../components/notifications/NotificationsTable";
import type { NotificationItemDto } from "../../api/orval/model";
import "../../css/Settings.css";
import "../../css/TelegramBotUsers.css";

export function NotificationsSection({
  notifications,
  anyLoading,
  refreshing,
  errorMessage,
  handleRefresh,
  onMarkRead,
  markReadLoading,
  onSendTest,
  sendTestLoading,
  showSendTest,
}: {
  notifications: NotificationItemDto[];
  anyLoading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  handleRefresh: () => void;
  onMarkRead: (id: number) => void;
  markReadLoading: boolean;
  onSendTest: () => void;
  sendTestLoading: boolean;
  showSendTest: boolean;
}) {
  return (
    <>
      <div className="header-bar">
        <div className="left-buttons">
          <button
            type="button"
            className="btn secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
          </button>
          {showSendTest && (
            <button
              type="button"
              className="btn secondary"
              onClick={onSendTest}
              disabled={sendTestLoading}
            >
              <FaBell className="icon" /> Send test notification
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div>
          <p className="error-message">❌ {errorMessage}</p>
        </div>
      )}

      <NotificationsTable
        notifications={notifications}
        loading={anyLoading}
        onMarkRead={onMarkRead}
        markReadLoading={markReadLoading}
      />
    </>
  );
}
