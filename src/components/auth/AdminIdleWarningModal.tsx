import { useEffect, useState } from "react";
import { logout } from "../../api/apirequest";
import { formatRemainingTime } from "../../utils/auth/tokenExpiration";
import {
  ADMIN_IDLE_WARNING_CLEARED_EVENT,
  ADMIN_IDLE_WARNING_EVENT,
  type AdminIdleWarningDetail,
} from "../../utils/auth/adminIdleSessionEvents";
import { requestStaySignedIn } from "../../utils/auth/adminIdleSession";
import "../../css/Settings.css";

/**
 * Shown in the last minute of admin idle timeout before automatic logout.
 */
export function AdminIdleWarningModal() {
  const [logoutAtMs, setLogoutAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const onWarn = (ev: Event) => {
      const detail = (ev as CustomEvent<AdminIdleWarningDetail>).detail;
      if (!detail?.logoutAtMs) return;
      setLogoutAtMs(detail.logoutAtMs);
      setRemainingMs(Math.max(0, detail.logoutAtMs - Date.now()));
    };
    const onClear = () => setLogoutAtMs(null);

    window.addEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
    window.addEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onClear);
    return () => {
      window.removeEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
      window.removeEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onClear);
    };
  }, []);

  useEffect(() => {
    if (logoutAtMs == null) return;
    const tick = () => setRemainingMs(Math.max(0, logoutAtMs - Date.now()));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [logoutAtMs]);

  if (logoutAtMs == null) return null;

  return (
    <div
      className="modal-overlay idle-warning-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warn-title"
    >
      <div className="modal-content" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 id="idle-warn-title">Session expiring soon</h3>
        </div>
        <div className="modal-body" style={{ padding: "16px 20px" }}>
          <p className="settings-item-description" style={{ marginBottom: 12 }}>
            You will be signed out in <strong>{formatRemainingTime(remainingMs)}</strong> due to no recent API
            activity.
          </p>
          <p className="settings-item-description" style={{ marginBottom: 0 }}>
            Stay signed in to keep working, or sign out now.
          </p>
        </div>
        <div
          className="modal-footer"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <button type="button" className="btn secondary" onClick={() => logout()}>
            Sign out
          </button>
          <button type="button" className="btn primary" onClick={() => requestStaySignedIn()}>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
