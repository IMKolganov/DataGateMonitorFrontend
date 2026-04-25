import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FaTelegramPlane } from "react-icons/fa";
import axios from "axios";
import { postApiAuthLogin } from "../../api/orval/auth/auth";
import type { LoginRequest, LoginResponse } from "../../api/orvalModelShim";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_EXPIRATION, REFRESH_TOKEN_KEY } from "../../utils/const";
import { scheduleAutoLogout } from "../../utils/auth/authSession";
import { Link } from "react-router-dom";
import GoogleLoginForm from "../../components/auth/GoogleLoginForm";
import { axiosResponseDataMessage, axiosResponseDetail, errorMessage } from "../../utils/errorMessage";
import { getXrayLanguage, setXrayLanguage, XRAY_LANGUAGE_OPTIONS, XRAY_TRANSLATIONS } from "./i18n";
import { appVersion } from "../../version";
import "../../css/XrayPortal.css";

const XrayLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState(getXrayLanguage);
  const t = XRAY_TRANSLATIONS[lang].login;

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    return <Navigate to="/xray/" replace />;
  }

  const canSubmit = login.trim().length > 0 && password.trim().length > 0 && !loading;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: LoginRequest = {
        login: login.trim(),
        password,
      };

      const response = (await postApiAuthLogin(payload)) as LoginResponse;
      if (!response?.token) {
        throw new Error("Token was not returned.");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, response.token);
      if (response.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      }
      if (response.refreshExpiration) {
        localStorage.setItem(REFRESH_TOKEN_EXPIRATION, response.refreshExpiration);
      }

      scheduleAutoLogout(response.token);
      navigate("/xray/", { replace: true });
    } catch (e: unknown) {
      let detailedMessage = t.failedSignIn;
      if (axios.isAxiosError(e)) {
        const data = e.response?.data;
        const msg = axiosResponseDataMessage(data);
        const detail = axiosResponseDetail(data);
        let mappedEmailConfirm = false;
        detailedMessage = msg ?? e.message ?? t.failedSignIn;
        if (/email is not confirmed/i.test(detailedMessage) || (detail && /email is not confirmed/i.test(detail))) {
          detailedMessage = t.emailNotConfirmedHelp;
          mappedEmailConfirm = true;
        }
        if (!mappedEmailConfirm && detail && detail !== detailedMessage) {
          detailedMessage = `${detailedMessage} ${detail}`;
        }
      } else {
        detailedMessage = errorMessage(e) || t.failedSignIn;
      }
      setError(detailedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="xray-page xray-page--centered">
      <div className="xray-login-shell">
        <div className="xray-language-row">
          <label htmlFor="xray-lang" className="xray-language-label">
            Language
          </label>
          <select
            id="xray-lang"
            className="xray-language-select"
            value={lang}
            onChange={(event) => {
              const next = event.target.value as typeof lang;
              setLang(next);
              setXrayLanguage(next);
            }}
          >
            {XRAY_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <h1 className="xray-welcome-title">{t.welcome}</h1>

        <div className="xray-card xray-auth-card">
          <img src="/favicon.png" alt="DataGate" className="xray-logo" />
          <h2 className="xray-title">{t.accessTitle}</h2>
          <p className="xray-subtitle">{t.subtitle}</p>

          <form onSubmit={onSubmit} className="xray-auth-form">
            <label className="xray-label" htmlFor="xray-login">
              {t.usernameLabel}
            </label>
            <input
              id="xray-login"
              className="input-login"
              type="text"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
              required
            />

            <label className="xray-label" htmlFor="xray-password">
              {t.passwordLabel}
            </label>
            <input
              id="xray-password"
              className="input-login"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <p className="xray-error">{error}</p>}

            <button className="btn primary btn-fullwidth" type="submit" disabled={!canSubmit}>
              {loading ? t.signingIn : t.signIn}
            </button>
          </form>

          <div className="login-divider">
            <span>{t.or}</span>
          </div>

          <div className="social-login">
            <div className="social-login-item">
              <GoogleLoginForm redirectPath="/xray/" />
            </div>
          </div>

          <div className="register-container">
            <p>
              {t.createAccountPrompt} <Link to="/xray/register">{t.createAccount}</Link>
            </p>
          </div>
        </div>

        <div className="xray-login-footer-links xray-card">
          <h3 className="xray-footer-title">{t.footerTitle}</h3>
          <p className="xray-note">{t.telegramDescription}</p>
          <p>
            <a
              className="xray-telegram-button"
              href="https://t.me/datagateapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTelegramPlane aria-hidden />
              <span>{t.telegramLink}</span>
            </a>
          </p>

          <p className="xray-note">{t.appsDescription}</p>
          <p>
            <a
              className="xray-datagate-button"
              href="https://datagateapp.com/download"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/favicon.png" alt="" aria-hidden className="xray-datagate-logo" />
              <span>{t.appsLink}</span>
            </a>
          </p>

          <p className="xray-warning">{t.warningIos}</p>
        </div>
        <p className="xray-note xray-login-version">© {new Date().getFullYear()} DataGate Monitor v.{appVersion}</p>
      </div>
    </div>
  );
};

export default XrayLoginPage;
