import React, { useState } from "react";
import { Link } from "react-router-dom";
import { postApiAuthLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { LoginRequest, LoginResponse } from "../../api/orvalModelShim";
import { FaDoorOpen } from "react-icons/fa";
import { PasswordInput } from "./PasswordInput";
import TotpChallengeForm from "./TotpChallengeForm";
import { applyLoginFlow, type TotpChallengeState } from "../../utils/auth/handleLoginResponse";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

interface PasswordLoginFormProps {
  redirectPath?: string;
}

const PasswordLoginForm: React.FC<PasswordLoginFormProps> = ({ redirectPath = "/" }) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpChallenge, setTotpChallenge] = useState<TotpChallengeState | null>(null);

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

      const loginPayload = orvalPayload<LoginResponse>(await postApiAuthLogin(loginReq));

      applyLoginFlow(loginPayload, {
        redirectPath,
        onTotpChallenge: setTotpChallenge,
      });
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

  if (totpChallenge) {
    return (
      <TotpChallengeForm
        loginChallengeId={totpChallenge.loginChallengeId}
        displayName={totpChallenge.displayName}
        redirectPath={redirectPath}
        onBack={() => setTotpChallenge(null)}
      />
    );
  }

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
