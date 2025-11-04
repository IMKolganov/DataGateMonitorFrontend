import React, { useState, useEffect } from "react";
import {
  getApiAuthSystemSecretStatus,
  postApiAuthSetSystemSecret,
  postApiAuthToken,
} from "../api/orval/auth/auth";
import type {
  SetSecretRequest,
  TokenRequest,
  SystemSecretStatusResponse,
  TokenResponse,
} from "../api/orval/model";
import { FaDoorOpen } from "react-icons/fa";
import "../css/Login.css";
import { appVersion } from "../version";
import { scheduleAutoLogout } from "../utils/jwt-utils";

const Login: React.FC = () => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [, setSystemSet] = useState<boolean | null>(null);

  const canSubmit =
    clientId.trim().length > 0 &&
    clientSecret.trim().length > 0 &&
    !loading &&
    statusReady;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = (await getApiAuthSystemSecretStatus()) as SystemSecretStatusResponse;
        const isSet = status?.systemSet === true;
        setSystemSet(isSet);
      } catch (err: any) {
        let detailedMessage =
          "We couldn't connect to the server. Please make sure it's running.";
        if (err.response) {
          detailedMessage += ` Server responded with status ${err.response.status} (${err.response.statusText}).`;
        } else if (err.request) {
          detailedMessage += " The server did not respond.";
        } else if (err.message) {
          detailedMessage += ` Error: ${err.message}`;
        }
        if (err.config?.url) {
          const fullUrl = err.config.baseURL
            ? `${err.config.baseURL}${err.config.url}`
            : err.config.url;
          detailedMessage += `<br/>You can also try opening <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${fullUrl}</a> in your browser.`;
        }
        setError(detailedMessage);
      } finally {
        setStatusReady(true);
      }
    };

    checkStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const latest = (await getApiAuthSystemSecretStatus()) as SystemSecretStatusResponse;
      const latestIsSet = latest?.systemSet === true;
      setSystemSet(latestIsSet);

      if (!latestIsSet) {
        const body: SetSecretRequest = { clientId, clientSecret };
        try {
          await postApiAuthSetSystemSecret(body);
        } catch (err: any) {
          const msg: string =
            err?.response?.data?.message ??
            err?.response?.data ??
            err?.message ??
            "";
          if (!/already\s+set/i.test(msg)) {
            throw err;
          }
        }
      }

      const tokenReq: TokenRequest = { clientId, clientSecret };
      const tokenPayload = (await postApiAuthToken(tokenReq)) as TokenResponse;
      const token = tokenPayload?.token;

      if (!token) {
        throw new Error("No token returned by API.");
      }

      localStorage.setItem("token", token);
      scheduleAutoLogout(token);
      window.location.href = "/";
    } catch (err: any) {
      let detailedMessage =
        "We couldn't log you in. Please check your credentials and try again.";
      if (err.response) {
        detailedMessage += ` Server responded with status ${err.response.status} (${err.response.statusText}).`;
        if (err.response.data?.error) {
          detailedMessage += ` Details: ${err.response.data.error}`;
        }
      } else if (err.request) {
        detailedMessage += " The server did not respond.";
      } else if (err.message) {
        detailedMessage += ` Error: ${err.message}`;
      }

      if (err.config?.url) {
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
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login">
          <h2>Sign in</h2>
          {error && (
            <p
              className="error-message"
              dangerouslySetInnerHTML={{ __html: error }}
            ></p>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-item">
              <h4>Login:</h4>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input input-login"
                required
                placeholder="Login"
              />
            </div>

            <div className="login-item">
              <h4>Password:</h4>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="input input-login"
                required
                placeholder="Password"
              />
            </div>

            <div className="login-item right">
              <button className="btn primary" type="submit" disabled={!canSubmit}>
                {FaDoorOpen({ className: "icon" })} {loading ? "Loading..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>

        <div className="register-container">
          <p>
            New to OpenVPN Gate Monitor? <a href="/register">Create an account</a>
          </p>
        </div>

        <div className="footer">
          <p>© 2024 OpenVPN Gate Monitor v. {appVersion}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;