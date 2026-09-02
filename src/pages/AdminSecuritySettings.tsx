import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaClock, FaCopy, FaSave, FaShieldAlt, FaTrash } from "react-icons/fa";
import {
  getApiAuthTotpStatus,
  postApiAuthTotpConfirm,
  postApiAuthTotpDisable,
  postApiAuthTotpSetup,
} from "../api/orval/auth/auth";
import {
  useGetApiSettingsGet,
  usePostApiSettingsSet,
} from "../api/orval/settings/settings";
import { orvalPayload } from "../api/orvalPayload";
import type { TotpSetupResponse, TotpStatusResponse } from "../api/orvalModelShim";
import { PasswordInput } from "../components/auth/PasswordInput";
import { TotpSetupQrCode } from "../components/auth/TotpSetupQrCode";
import { AdminActiveSessions } from "../components/settings/AdminActiveSessions";
import { errorMessage } from "../utils/errorMessage";
import { notifyAdminIdlePolicyChanged } from "../utils/auth/adminIdleSessionEvents";
import "../css/Settings.css";

const KEY_ADMIN_IDLE_TIMEOUT_MINUTES = "Auth_Admin_Idle_Timeout_Minutes";
const MIN_IDLE_MINUTES = 1;
const MAX_IDLE_MINUTES = 24 * 60;

export default function AdminSecuritySettings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TotpStatusResponse | null>(null);
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(15);
  const [idleSaveInfo, setIdleSaveInfo] = useState("");
  const [idleSaveError, setIdleSaveError] = useState("");

  const idleParams = useMemo(() => ({ Key: KEY_ADMIN_IDLE_TIMEOUT_MINUTES }), []);
  const {
    data: idleResp,
    isLoading: idleLoading,
    error: idleLoadErr,
  } = useGetApiSettingsGet(idleParams, {
    query: { retry: false },
  });
  const setSettingMutation = usePostApiSettingsSet();

  useEffect(() => {
    if (idleResp == null || typeof idleResp !== "object") return;
    const r = idleResp as Record<string, unknown>;
    const data = r["data"] as Record<string, unknown> | undefined;
    const setting = r["setting"] as Record<string, unknown> | undefined;
    const dataSetting = data?.["setting"] as Record<string, unknown> | undefined;
    const v =
      r["value"] ??
      data?.["value"] ??
      dataSetting?.["value"] ??
      setting?.["value"];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) setIdleMinutes(n);
  }, [idleResp]);

  const refreshStatus = useCallback(async () => {
    const next = orvalPayload<TotpStatusResponse>(await getApiAuthTotpStatus());
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    void refreshStatus().catch((e: unknown) => setError(errorMessage(e)));
  }, [refreshStatus]);

  const handleSaveIdleTimeout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdleSaveError("");
    setIdleSaveInfo("");
    if (!Number.isFinite(idleMinutes) || idleMinutes < MIN_IDLE_MINUTES || idleMinutes > MAX_IDLE_MINUTES) {
      setIdleSaveError(`Idle timeout must be between ${MIN_IDLE_MINUTES} and ${MAX_IDLE_MINUTES} minutes.`);
      return;
    }
    try {
      await setSettingMutation.mutateAsync({
        params: {
          Key: KEY_ADMIN_IDLE_TIMEOUT_MINUTES,
          Value: String(Math.round(idleMinutes)),
          Type: "int",
        },
      });
      notifyAdminIdlePolicyChanged();
      setIdleSaveInfo(
        "Saved. The warning appears in the last minute of inactivity; new logins pick up the timeout from the session policy.",
      );
    } catch (err: unknown) {
      setIdleSaveError(errorMessage(err));
    }
  };

  const handleBeginSetup = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const nextSetup = orvalPayload<TotpSetupResponse>(await postApiAuthTotpSetup());
      setSetup(nextSetup);
      setConfirmCode("");
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const wasRequired = status?.requiresTotpSetup ?? false;
    try {
      await postApiAuthTotpConfirm({ code: confirmCode.trim() });
      setSetup(null);
      setConfirmCode("");
      await refreshStatus();
      setInfo("Two-factor authentication is now enabled for your admin account.");
      if (wasRequired) {
        navigate("/servers", { replace: true });
      }
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await postApiAuthTotpDisable({
        code: disableCode.trim(),
        password: disablePassword.trim() || undefined,
      });
      setDisableCode("");
      setDisablePassword("");
      await refreshStatus();
      setInfo("Two-factor authentication has been disabled. You will be prompted to set it up again on next sign-in.");
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!setup?.sharedSecret) return;
    try {
      await navigator.clipboard.writeText(setup.sharedSecret);
      setInfo("Secret copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  if (!status) {
    return <p className="settings-item-description">Loading security settings…</p>;
  }

  if (!status.isAdmin) {
    return (
      <p className="settings-item-description">
        Two-factor authentication applies to administrator accounts only.
      </p>
    );
  }

  return (
    <>
      <h2 className="settings-page__h2-with-icon">
        <FaShieldAlt className="icon" aria-hidden />
        <span>Admin security</span>
      </h2>

      <p className="settings-item-description" style={{ marginBottom: 24, maxWidth: 960 }}>
        Administrators must use an authenticator app (Google Authenticator, Authy, 1Password, etc.) for a
        time-based one-time password (TOTP) when signing in to the panel.
      </p>

      {status.requiresTotpSetup ? (
        <p className="error-message" role="alert" style={{ maxWidth: 720 }}>
          You must enable two-factor authentication before using the admin panel.
        </p>
      ) : null}

      {error ? <p className="error-message">{error}</p> : null}
      {info ? <p className="settings-item-description">{info}</p> : null}

      {status.totpEnabled ? (
        <>
          <p className="settings-item-description" style={{ marginBottom: 16, maxWidth: 720 }}>
            <strong>Status:</strong> enabled. You will be asked for a code after each sign-in.
          </p>
          <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
            <FaTrash className="icon" aria-hidden />
            <span>Disable two-factor authentication</span>
          </h3>
          <div className="quota-plan-modal" style={{ maxWidth: 640 }}>
            <form onSubmit={handleDisable}>
              <div className="form-row">
                <label htmlFor="totp-disable-code">Authenticator code</label>
                <input
                  id="totp-disable-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="totp-disable-password">Account password</label>
                <p className="settings-item-description" style={{ marginBottom: 8 }}>
                  Required only if you sign in with a password. Google sign-in can leave this empty.
                </p>
                <PasswordInput
                  id="totp-disable-password"
                  autoComplete="current-password"
                  className="input"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              <div className="settings-item" style={{ marginTop: 12 }}>
                <button type="submit" className="btn secondary" disabled={loading}>
                  <FaTrash className="icon" /> {loading ? "Disabling…" : "Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="settings-item-description" style={{ marginBottom: 16, maxWidth: 720 }}>
            <strong>Status:</strong> not configured.
          </p>
          {!setup ? (
            <button type="button" className="btn primary" onClick={() => void handleBeginSetup()} disabled={loading}>
              <FaShieldAlt className="icon" /> {loading ? "Preparing…" : "Set up authenticator"}
            </button>
          ) : (
            <div className="quota-plan-modal" style={{ maxWidth: 640 }}>
              <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
                <FaShieldAlt className="icon" aria-hidden />
                <span>Scan or enter the secret</span>
              </h3>
              <p className="settings-item-description" style={{ marginBottom: 12 }}>
                Scan the QR code with your authenticator app, or enter the secret manually below.
              </p>
              {typeof setup.otpAuthUri === "string" && setup.otpAuthUri.length > 0 ? (
                <div
                  className="totp-setup-qr"
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    display: "inline-block",
                    background: "#fff",
                    borderRadius: 8,
                    lineHeight: 0,
                  }}
                >
                  <TotpSetupQrCode value={setup.otpAuthUri} size={200} />
                </div>
              ) : null}
              <p style={{ marginBottom: 12 }}>
                <a href={setup.otpAuthUri ?? undefined} className="register-link">
                  Open in authenticator app
                </a>
              </p>
              <p className="settings-item-description" style={{ marginBottom: 12 }}>
                <strong>Issuer:</strong> {setup.issuer}
                <br />
                <strong>Account:</strong> {setup.accountName}
              </p>
              <div className="secret-copy-row">
                <code>{setup.sharedSecret}</code>
                <button type="button" className="btn secondary" onClick={() => void copySecret()}>
                  <FaCopy className="icon" /> Copy secret
                </button>
              </div>
              <form onSubmit={handleConfirmSetup}>
                <div className="form-row">
                  <label htmlFor="totp-confirm-code">Verification code from app</label>
                  <input
                    id="totp-confirm-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="input"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                  />
                </div>
                <div className="settings-item" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={loading || confirmCode.trim().length !== 6}
                  >
                    {loading ? "Confirming…" : "Confirm and enable"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setSetup(null);
                      setConfirmCode("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      <AdminActiveSessions />

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 32, marginBottom: 12 }}>
        <FaClock className="icon" aria-hidden />
        <span>Admin session idle timeout</span>
      </h3>
      <p className="settings-item-description" style={{ marginBottom: 16, maxWidth: 720 }}>
        After this many minutes without authenticated API activity, administrators are signed out. A warning is shown in the
        last minute. Minimum {MIN_IDLE_MINUTES} minutes.
      </p>
      {idleLoadErr ? (
        <p className="settings-item-description" style={{ marginBottom: 8 }}>
          Using default until the setting is saved ({errorMessage(idleLoadErr)}).
        </p>
      ) : null}
      {idleSaveError ? <p className="error-message">{idleSaveError}</p> : null}
      {idleSaveInfo ? <p className="settings-item-description">{idleSaveInfo}</p> : null}
      <form onSubmit={(e) => void handleSaveIdleTimeout(e)} className="quota-plan-modal" style={{ maxWidth: 420 }}>
        <div className="form-row">
          <label htmlFor="admin-idle-minutes">Idle timeout (minutes)</label>
          <input
            id="admin-idle-minutes"
            type="number"
            className="input"
            min={MIN_IDLE_MINUTES}
            max={MAX_IDLE_MINUTES}
            value={idleMinutes}
            disabled={idleLoading || setSettingMutation.isPending}
            onChange={(e) => setIdleMinutes(Number(e.target.value))}
          />
        </div>
        <div className="settings-item" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={idleLoading || setSettingMutation.isPending}>
            <FaSave className="icon" /> {setSettingMutation.isPending ? "Saving…" : "Save idle timeout"}
          </button>
        </div>
      </form>
    </>
  );
}
