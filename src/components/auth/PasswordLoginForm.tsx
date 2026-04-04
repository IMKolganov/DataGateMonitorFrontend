import React, { useState } from "react";
import { Link } from "react-router-dom";
import { postApiAuthLogin } from "../../api/orval/auth/auth";
import type { LoginRequest, LoginResponse } from "../../api/orval/model";
import { FaDoorOpen } from "react-icons/fa";
import { PasswordInput } from "./PasswordInput";
import { scheduleAutoLogout } from "../../utils/auth/authSession";
import {ACCESS_TOKEN_KEY, REFRESH_TOKEN_EXPIRATION, REFRESH_TOKEN_KEY} from "../../utils/const.ts";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

const PasswordLoginForm: React.FC = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
      login.trim().length > 0 &&
      password.trim().length > 0 &&
      !loading;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginReq: LoginRequest = {
        login,
        password,
      };

      const loginPayload = (await postApiAuthLogin(
          loginReq,
      )) as LoginResponse;

      const token = loginPayload?.token;
      const refreshToken = loginPayload?.refreshToken;
      const refreshExpiration = loginPayload?.refreshExpiration;

      if (!token) {
        throw new Error("No token returned by API.");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      if (refreshExpiration) {
        localStorage.setItem(REFRESH_TOKEN_EXPIRATION, refreshExpiration);
      }
      scheduleAutoLogout(token);
      window.location.href = "/";
    } catch (err: unknown) {
      let detailedMessage = "We could not log you in.";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          const m = axiosResponseDataMessage(data);

          if (status === 401) {
            detailedMessage = m || "Invalid login or password. Please try again.";
          } else if (status >= 400 && status < 500) {
            detailedMessage = m || "The request could not be processed. Please check your input.";
          } else {
            detailedMessage =
              m || "We could not log you in due to a server error. Please try again later.";
          }
        } else if (err.request) {
          detailedMessage =
            "We could not connect to the server. Please make sure it is running.";
        } else if (err.message) {
          detailedMessage = `Error: ${err.message}`;
        }

        if (err.config?.url && !err.response) {
          const fullUrl = err.config.baseURL
            ? `${err.config.baseURL}${err.config.url}`
            : err.config.url;
          detailedMessage += `<br/>You can also try opening <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${fullUrl}</a> in your browser.`;
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
      <>
        {error && (
            <p
                className="error-message"
                dangerouslySetInnerHTML={{ __html: error }}
            ></p>
        )}

        <form onSubmit={handleLogin}>
          <div className="login-item">
            <h4>Username or email address</h4>
            <input
                type="text"
                name="username"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input-login"
                required
                placeholder=""
            />
          </div>

          <div className="login-item">
            <div className="password-label-row">
              <h4>Password</h4>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <FaDoorOpen className="icon" />{" "}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </>
  );
};

export default PasswordLoginForm;
