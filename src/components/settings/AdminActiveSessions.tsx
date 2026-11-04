import { useCallback, useEffect, useMemo, useState } from "react";
import { FaDesktop, FaSignOutAlt } from "react-icons/fa";
import { logout } from "../../api/apirequest";
import {
  fetchAdminSessions,
  revokeAdminSession,
  revokeAllAdminSessions,
  revokeOtherAdminSessions,
  type UserSessionDto,
} from "../../utils/auth/adminSessionsApi";
import {
  formatRelativeTime,
  formatSessionDeviceLabel,
  getSessionActivityStatus,
  type SessionActivityStatus,
} from "../../utils/auth/formatSessionDevice";
import { errorMessage } from "../../utils/errorMessage";

function statusLabel(status: SessionActivityStatus): string {
  switch (status) {
    case "current":
      return "This device";
    case "active":
      return "Active";
    case "idle":
      return "Idle";
  }
}

function sortSessions(sessions: UserSessionDto[]): UserSessionDto[] {
  return [...sessions].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    const aMs = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bMs = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bMs - aMs;
  });
}

export function AdminActiveSessions() {
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const data = await fetchAdminSessions();
      setSessions(sortSessions(data.sessions ?? []));
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const idleSessions = useMemo(
    () => sessions.filter((s) => getSessionActivityStatus(s) === "idle" && s.id != null),
    [sessions],
  );

  const summary = useMemo(() => {
    let active = 0;
    let idle = 0;
    for (const s of sessions) {
      const status = getSessionActivityStatus(s);
      if (status === "idle") idle += 1;
      else active += 1;
    }
    return { total: sessions.length, active, idle };
  }, [sessions]);

  const runAction = async (action: () => Promise<void | number>, successMessage: string) => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await action();
      setInfo(successMessage);
      await reload();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 32, marginBottom: 12 }}>
        <FaDesktop className="icon" aria-hidden />
        <span>Active sessions</span>
      </h3>
      <p className="settings-item-description" style={{ marginBottom: 12, maxWidth: 720 }}>
        Each sign-in keeps a refresh token until it expires or you revoke it.{" "}
        <strong>Active</strong> means the token was used recently (sign-in or refresh);
        <strong> Idle</strong> tokens are still valid but unused — revoke them if you do not
        recognize the device.
      </p>

      {summary.total > 0 ? (
        <p className="settings-item-description admin-session-summary">
          {summary.total} session{summary.total === 1 ? "" : "s"}
          {" · "}
          {summary.active} active
          {" · "}
          {summary.idle} idle
        </p>
      ) : null}

      {error ? <p className="error-message">{error}</p> : null}
      {info ? <p className="settings-item-description">{info}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          className="btn secondary"
          disabled={loading || idleSessions.length === 0}
          onClick={() =>
            void runAction(async () => {
              for (const session of idleSessions) {
                if (session.id != null) await revokeAdminSession(session.id);
              }
            }, `Revoked ${idleSessions.length} idle session${idleSessions.length === 1 ? "" : "s"}.`)
          }
        >
          <FaSignOutAlt className="icon" /> Revoke idle sessions
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={loading}
          onClick={() =>
            void runAction(
              async () => {
                await revokeOtherAdminSessions();
              },
              "Signed out on all other devices.",
            )
          }
        >
          <FaSignOutAlt className="icon" /> Sign out other devices
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={loading}
          onClick={() =>
            void runAction(
              async () => {
                await revokeAllAdminSessions();
                logout();
              },
              "Signed out everywhere.",
            )
          }
        >
          <FaSignOutAlt className="icon" /> Sign out all devices
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="settings-item-description">No active sessions.</p>
      ) : (
        <ul className="settings-item-description admin-session-list">
          {sessions.map((session) => {
            const status = getSessionActivityStatus(session);
            return (
              <li key={session.id} className={`admin-session-row admin-session-row--${status}`}>
                <div className="admin-session-row__meta">
                  <div className="admin-session-row__title">
                    <strong>{formatSessionDeviceLabel(session)}</strong>
                    <span className={`admin-session-status admin-session-status--${status}`}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  <div className="admin-session-row__since">
                    Last active {formatRelativeTime(session.createdAt)}
                    {session.expiresAt
                      ? ` · Expires ${formatRelativeTime(session.expiresAt)}`
                      : null}
                  </div>
                </div>
                {!session.isCurrent && session.id != null ? (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={loading}
                    onClick={() =>
                      void runAction(
                        () => revokeAdminSession(session.id!),
                        "Session revoked.",
                      )
                    }
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
