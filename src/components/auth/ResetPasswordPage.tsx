import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { postApiAuthResetPassword } from "../../api/orval/auth/auth";
import type { AdminResetPasswordRequest } from "../../api/orval/model";
import { FaKey } from "react-icons/fa";
import { PasswordInput } from "./PasswordInput";
import "../../css/Login.css";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl);
  }, [codeFromUrl]);

  const canSubmit =
    code.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    newPassword === confirmPassword &&
    !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const req: AdminResetPasswordRequest = {
        code: code.trim() || null,
        newPassword: newPassword || null,
        confirmPassword: confirmPassword || null,
      };
      await postApiAuthResetPassword(req);
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? axiosResponseDataMessage(err.response?.data) ??
          err.message ??
          "Password reset failed."
        : errorMessage(err);
      setError(msg || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-logo-circle">
            <img src="/favicon.png" alt="Logo" className="logo-icon-login" />
          </div>
          <h1 className="login-page-title">Password changed</h1>
          <div className="login">
            <p className="login-info-text">
              Password has been changed successfully. Sign in with your new password.
            </p>
            <p className="login-info-text">
              <Link to="/login">Go to sign in</Link> (redirect in a few seconds)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-logo-circle">
          <img src="/favicon.png" alt="Logo" className="logo-icon-login" />
        </div>
        <h1 className="login-page-title">Reset password by code</h1>
        <div className="login">
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="login-item">
              <h4>Code from server console</h4>
              <input
                type="text"
                name="code"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-login"
                required
                placeholder="Paste the one-time code"
              />
            </div>
            <div className="login-item">
              <h4>New password</h4>
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-login"
                required
                placeholder=""
              />
            </div>
            <div className="login-item">
              <h4>Confirm password</h4>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-login"
                required
                placeholder=""
              />
            </div>
            <div className="login-item">
              <button
                className="btn primary btn-fullwidth"
                type="submit"
                disabled={!canSubmit}
              >
                <FaKey className="icon" />{" "}
                {loading ? "Sending…" : "Reset password"}
              </button>
            </div>
          </form>
        </div>
        <div className="register-container">
          <p>
            <Link to="/login" className="register-link">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
