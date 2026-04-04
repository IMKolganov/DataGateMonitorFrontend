import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postApiAuthRegister } from "../../api/orval/auth/auth";
import type { RegisterUserRequest } from "../../api/orval/model";
import { FaUserPlus } from "react-icons/fa";
import { PasswordInput } from "./PasswordInput";
import "../../css/Login.css";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    login.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword &&
    !loading;

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const req: RegisterUserRequest = {
        displayName: displayName.trim() || null,
        email: email.trim() || null,
        login: login.trim(),
        password,
        confirmPassword,
      };

      await postApiAuthRegister(req);

      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err: unknown) {
      let detailedMessage = "Registration failed.";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const m = axiosResponseDataMessage(err.response.data);

          if (status >= 400 && status < 500) {
            detailedMessage = m ?? "Please check your input and try again.";
          } else {
            detailedMessage = m ?? "Server error. Please try again later.";
          }
        } else if (err.request) {
          detailedMessage =
            "Could not connect to the server. Please ensure it is running.";
        } else if (err.message) {
          detailedMessage = `Error: ${err.message}`;
        }

        if (err.config?.url && !err.response) {
          const fullUrl = err.config.baseURL
            ? `${err.config.baseURL}${err.config.url}`
            : err.config.url;
          detailedMessage += ` You can try opening <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${fullUrl}</a> in your browser.`;
        }
      } else {
        detailedMessage = `Error: ${errorMessage(err)}`;
      }

      setError(detailedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-logo-circle">
          <img src="/favicon.png" alt="Logo" className="logo-icon-login" />
        </div>

        <h1 className="login-page-title">Create your account</h1>

        <div className="login">
          {error && (
            <p
              className="error-message"
              dangerouslySetInnerHTML={{ __html: error }}
            />
          )}

          <form onSubmit={handleRegister}>
            <div className="login-item">
              <h4>Display name (optional)</h4>
              <input
                type="text"
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-login"
                placeholder=""
              />
            </div>

            <div className="login-item">
              <h4>Email (optional)</h4>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-login"
                placeholder=""
              />
            </div>

            <div className="login-item">
              <h4>Login</h4>
              <input
                type="text"
                name="login"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input-login"
                required
                placeholder=""
              />
            </div>

            <div className="login-item">
              <h4>Password</h4>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <FaUserPlus className="icon" />{" "}
                {loading ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        </div>

        <div className="register-container">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
