import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  postApiAuthForgotPassword,
  postApiAuthResetPassword,
} from "../../api/orval/auth/auth";
import type {
  AdminForgotPasswordRequest,
  AdminResetPasswordRequest,
} from "../../api/orvalModelShim";
import { FaPaperPlane, FaKey } from "react-icons/fa";
import { PasswordInput } from "./PasswordInput";
import "../../css/Login.css";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

const MESSAGE_AFTER_FORGOT =
  "If an admin account exists with this login and password login is enabled, the reset code is sent to the account email when configured and written to the server console. Otherwise the user was not found.";

const HINT_CODE =
  "Check your inbox for the code, or if you manage the server, read the application console. Then enter the code below.";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [step2, setStep2] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

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
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.request && !err.response) {
        setForgotError("Could not connect to the server. Please try again later.");
        setForgotLoading(false);
        return;
      }
    } finally {
      setForgotLoading(false);
      setStep2(true);
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
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? axiosResponseDataMessage(err.response?.data) ??
          err.message ??
          "Password reset failed."
        : errorMessage(err);
      setResetError(msg || "Password reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  if (resetSuccess) {
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
        <h1 className="login-page-title">
          {step2 ? "Reset password by code" : "Forgot password"}
        </h1>

        {!step2 ? (
          <>
            <div className="login">
              {forgotError && (
                <p className="error-message">{forgotError}</p>
              )}
              <p className="login-info-text" style={{ marginBottom: 12 }}>
                Enter the administrator login or email.
              </p>
              <form onSubmit={handleForgotSubmit}>
                <div className="login-item">
                  <h4>Login or email</h4>
                  <input
                    type="text"
                    name="loginOrEmail"
                    autoComplete="username email"
                    value={loginOrEmail}
                    onChange={(e) => setLoginOrEmail(e.target.value)}
                    className="input-login"
                    required
                    placeholder=""
                  />
                </div>
                <div className="login-item">
                  <button
                    className="btn primary btn-fullwidth"
                    type="submit"
                    disabled={!canSubmitForgot}
                  >
                    <FaPaperPlane className="icon" />{" "}
                    {forgotLoading ? "Sending…" : "Request reset"}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="login">
              <p className="login-info-text" style={{ marginBottom: 8 }}>
                {MESSAGE_AFTER_FORGOT}
              </p>
              <p className="login-info-text" style={{ marginBottom: 16 }}>
                {HINT_CODE}
              </p>

              {resetError && (
                <p className="error-message">{resetError}</p>
              )}

              <form onSubmit={handleResetSubmit}>
                <div className="login-item">
                  <h4>One-time reset code</h4>
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
                    disabled={!canSubmitReset}
                  >
                    <FaKey className="icon" />{" "}
                    {resetLoading ? "Sending…" : "Reset password"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        <div className="register-container">
          <p>
            <Link to="/login" className="register-link">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
