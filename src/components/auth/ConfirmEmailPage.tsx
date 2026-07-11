import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  postApiAuthEmailConfirm,
  postApiAuthEmailRequestConfirmation,
} from "../../api/orval/auth/auth";
import type { AuthResponsesConfirmEmailResponse } from "../../api/orval/model/authResponsesConfirmEmailResponse";
import { orvalPayload } from "../../api/orvalPayload";
import { FaCheckCircle, FaEnvelope, FaPaperPlane } from "react-icons/fa";
import "../../css/Login.css";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

interface ConfirmEmailPageProps {
  loginPath?: string;
  registerPath?: string;
}

const RESEND_SUCCESS =
  "If this email is registered and not yet confirmed, a new code has been sent.";

const ConfirmEmailPage: React.FC<ConfirmEmailPageProps> = ({
  loginPath = "/login",
  registerPath = "/register",
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email") ?? "";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [appliedUrlEmail, setAppliedUrlEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    justRegistered
      ? "We sent a 6-digit confirmation code to your email. Enter it below to finish registration."
      : "",
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (emailFromUrl && emailFromUrl !== appliedUrlEmail) {
    setAppliedUrlEmail(emailFromUrl);
    setEmail(emailFromUrl);
  }

  const canSubmitConfirm =
    email.trim().length > 0 && code.trim().length > 0 && !confirmLoading;

  const canResend = email.trim().length > 0 && !resendLoading && !confirmLoading;

  const handleConfirmSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setConfirmLoading(true);

    try {
      const result = orvalPayload<AuthResponsesConfirmEmailResponse>(
        await postApiAuthEmailConfirm({
          email: email.trim() || null,
          code: code.trim() || null,
        }),
      );

      if (!result.success) {
        setError(result.message?.trim() || "Invalid or expired confirmation code.");
        return;
      }

      setConfirmed(true);
      setTimeout(() => navigate(loginPath, { replace: true }), 2500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? axiosResponseDataMessage(err.response?.data) ??
          err.message ??
          "Email confirmation failed."
        : errorMessage(err);
      setError(msg || "Email confirmation failed.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResendLoading(true);

    try {
      await postApiAuthEmailRequestConfirmation({
        email: email.trim() || null,
      });
      setInfo(RESEND_SUCCESS);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.request && !err.response) {
        setError("Could not connect to the server. Please try again later.");
      } else {
        setInfo(RESEND_SUCCESS);
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-logo-circle">
            <img src="/favicon.png" alt="Logo" className="logo-icon-login" />
          </div>
          <h1 className="login-page-title">Email confirmed</h1>
          <div className="login">
            <p className="login-info-text">
              Your email has been confirmed. You can now sign in.
            </p>
            <p className="login-info-text">
              <Link to={loginPath}>Go to sign in</Link> (redirect in a few seconds)
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
        <h1 className="login-page-title">Confirm your email</h1>

        <div className="login">
          {!justRegistered && !info && (
            <p className="login-info-text" style={{ marginBottom: 16 }}>
              Enter the email you used when registering and the 6-digit code from
              the message we sent you.
            </p>
          )}

          {info && (
            <p className="login-info-text" style={{ marginBottom: 16 }}>
              {info}
            </p>
          )}

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleConfirmSubmit}>
            <div className="login-item">
              <h4>Email</h4>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-login"
                required
                placeholder=""
              />
            </div>

            <div className="login-item">
              <h4>Confirmation code</h4>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input-login"
                required
                placeholder="6-digit code from email"
                maxLength={12}
              />
            </div>

            <div className="login-item">
              <button
                className="btn primary btn-fullwidth"
                type="submit"
                disabled={!canSubmitConfirm}
              >
                <FaCheckCircle className="icon" />{" "}
                {confirmLoading ? "Confirming…" : "Confirm email"}
              </button>
            </div>
          </form>

          <div className="login-item" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-fullwidth"
              onClick={handleResend}
              disabled={!canResend}
            >
              <FaPaperPlane className="icon" />{" "}
              {resendLoading ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>

        <div className="register-container">
          <p>
            <FaEnvelope className="icon" style={{ marginRight: 6 }} />
            Did not receive the code? Check spam, then use “Resend code”.
          </p>
          <p>
            Already confirmed? <Link to={loginPath}>Sign in</Link>
          </p>
          <p>
            Need an account? <Link to={registerPath}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
