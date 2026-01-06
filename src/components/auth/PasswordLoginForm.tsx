import React, { useState } from "react";
import { postApiAuthLogin } from "../../api/orval/auth/auth";
import type { LoginRequest, LoginResponse } from "../../api/orval/model";
import { FaDoorOpen } from "react-icons/fa";
import { scheduleAutoLogout } from "../../utils/auth/authSession";

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

      if (!token) {
        throw new Error("No token returned by API.");
      }

      localStorage.setItem("token", token);
      scheduleAutoLogout(token);
      window.location.href = "/";
    } catch (err: any) {
      let detailedMessage = "We could not log you in.";

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 401) {
          // Invalid credentials / blocked user
          detailedMessage =
              data?.message || "Invalid login or password. Please try again.";
        } else if (status >= 400 && status < 500) {
          detailedMessage =
              data?.message ||
              "The request could not be processed. Please check your input.";
        } else {
          detailedMessage =
              data?.message ||
              "We could not log you in due to a server error. Please try again later.";
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
              <a href="#" className="forgot-password-link">
                Forgot password?
              </a>
            </div>
            <input
                type="password"
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
