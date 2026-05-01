import { useState } from "react";
import { FaKey, FaPaperPlane } from "react-icons/fa";
import { postApiAuthForgotPassword, postApiAuthResetPassword } from "../api/orval/auth/auth";
import type { AdminForgotPasswordRequest, AdminResetPasswordRequest } from "../api/orvalModelShim";
import { PasswordInput } from "../components/auth/PasswordInput";
import { axiosResponseDataMessage, errorMessage } from "../utils/errorMessage";
import "../css/Settings.css";
import axios from "axios";

const MESSAGE_AFTER_FORGOT =
  "If an admin account exists with this login and password login is enabled, a reset code is sent to the account email when configured, and always logged on the server. Otherwise the user was not found.";

const HINT_CODE =
  "Check your inbox for the code, or ask another administrator who can read the application console.";

export default function AdminPasswordRecoverySettings() {
  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const canSubmitForgot = loginOrEmail.trim().length > 0 && !forgotLoading;
  const canSubmitReset =
    code.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    newPassword === confirmPassword &&
    !resetLoading;

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      const req: AdminForgotPasswordRequest = {
        loginOrEmail: loginOrEmail.trim() || null,
      };
      await postApiAuthForgotPassword(req);
      setForgotDone(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.request && !err.response) {
        setForgotError("Could not connect to the server. Please try again later.");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      const req: AdminResetPasswordRequest = {
        code: code.trim() || null,
        newPassword: newPassword || null,
        confirmPassword: confirmPassword || null,
      };
      await postApiAuthResetPassword(req);
      setResetSuccess(true);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? axiosResponseDataMessage(err.response?.data) ?? err.message ?? "Password reset failed."
        : errorMessage(err);
      setResetError(msg || "Password reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <>
        <h2 className="settings-page__h2-with-icon">
          <FaKey className="icon" aria-hidden />
          <span>Admin password recovery</span>
        </h2>
        <p className="success-message" style={{ maxWidth: 720 }}>
          Password has been changed. You can sign in with the new password (this session is unchanged until you log out).
        </p>
        <button type="button" className="btn secondary" style={{ marginTop: 16 }} onClick={() => setResetSuccess(false)}>
          Reset another account
        </button>
      </>
    );
  }

  return (
    <>
      <h2 className="settings-page__h2-with-icon">
        <FaKey className="icon" aria-hidden />
        <span>Admin password recovery</span>
      </h2>

      <p className="settings-item-description" style={{ marginBottom: 24, maxWidth: 960 }}>
        Request a one-time code for any administrator login that uses password sign-in, then set a new password. The same
        flow is available without signing in at <strong>/forgot-password</strong>.
      </p>

      <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
        <FaPaperPlane className="icon" aria-hidden />
        <span>Step 1 — request code</span>
      </h3>
      <div className="quota-plan-modal" style={{ maxWidth: 640, marginBottom: 32 }}>
        {forgotError && <p className="error-message">{forgotError}</p>}
        {forgotDone && (
          <p className="settings-item-description" style={{ marginBottom: 16 }}>
            {MESSAGE_AFTER_FORGOT}
          </p>
        )}
        <form onSubmit={handleForgotSubmit}>
          <div className="form-row">
            <label htmlFor="admin-pwd-login">Administrator login or email</label>
            <input
              id="admin-pwd-login"
              type="text"
              className="input"
              autoComplete="username"
              value={loginOrEmail}
              onChange={(e) => setLoginOrEmail(e.target.value)}
              required
            />
          </div>
          <div className="settings-item" style={{ marginTop: 12 }}>
            <button className="btn primary" type="submit" disabled={!canSubmitForgot}>
              <FaPaperPlane className="icon" aria-hidden /> {forgotLoading ? "Sending…" : "Request reset code"}
            </button>
          </div>
        </form>
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
        <FaKey className="icon" aria-hidden />
        <span>Step 2 — enter code and new password</span>
      </h3>
      <p className="settings-item-description" style={{ marginBottom: 12, maxWidth: 960 }}>
        {HINT_CODE}
      </p>
      <div className="quota-plan-modal" style={{ maxWidth: 640, marginBottom: 24 }}>
        {resetError && <p className="error-message">{resetError}</p>}
        <form onSubmit={handleResetSubmit}>
          <div className="form-row">
            <label htmlFor="admin-pwd-code">One-time code</label>
            <input
              id="admin-pwd-code"
              type="text"
              className="input"
              name="code"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="From email or server console"
            />
          </div>
          <div className="form-row">
            <label htmlFor="admin-pwd-new">New password</label>
            <PasswordInput
              id="admin-pwd-new"
              name="newPassword"
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="admin-pwd-confirm">Confirm password</label>
            <PasswordInput
              id="admin-pwd-confirm"
              name="confirmPassword"
              autoComplete="new-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="settings-item" style={{ marginTop: 12 }}>
            <button className="btn primary" type="submit" disabled={!canSubmitReset}>
              <FaKey className="icon" aria-hidden /> {resetLoading ? "Saving…" : "Set new password"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
