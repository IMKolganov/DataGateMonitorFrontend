import { useCallback, useEffect, useState } from "react";
import { FaDesktop, FaSignOutAlt } from "react-icons/fa";
import { logout } from "../../api/apirequest";
import {
  fetchAdminSessions,
  revokeAdminSession,
  revokeAllAdminSessions,
  revokeOtherAdminSessions,
  type UserSessionDto,
} from "../../utils/auth/adminSessionsApi";
import { errorMessage } from "../../utils/errorMessage";

function formatSessionLabel(session: UserSessionDto): string {
  if (session.userAgent?.trim()) return session.userAgent.trim();
  if (session.deviceId?.trim()) return `Device ${session.deviceId}`;
  return `Session #${session.id}`;
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
      setSessions(data.sessions ?? []);
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      <p className="settings-item-description" style={{ marginBottom: 16, maxWidth: 720 }}>
        Each sign-in creates a refresh token (browser or device). Revoke sessions you no longer use.
      </p>

      {error ? <p className="error-message">{error}</p> : null}
      {info ? <p className="settings-item-description">{info}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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
        <ul className="settings-item-description" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sessions.map((session) => (
            <li
              key={session.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--border-color, #333)",
              }}
            >
              <div>
                <strong>{formatSessionLabel(session)}</strong>
                {session.isCurrent ? (
                  <span style={{ marginLeft: 8, opacity: 0.85 }}>(this device)</span>
                ) : null}
                <div style={{ fontSize: "0.9em", opacity: 0.75, marginTop: 4 }}>
                  Since {new Date(session.createdAt).toLocaleString()}
                </div>
              </div>
              {!session.isCurrent ? (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={loading}
                  onClick={() =>
                    void runAction(
                      () => revokeAdminSession(session.id),
                      "Session revoked.",
                    )
                  }
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
