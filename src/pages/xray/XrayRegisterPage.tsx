import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUserPlus } from "react-icons/fa";
import { postApiAuthRegister } from "../../api/orval/auth/auth";
import type { RegisterUserRequest } from "../../api/orvalModelShim";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";
import { getXrayLanguage, setXrayLanguage, XRAY_LANGUAGE_OPTIONS, XRAY_TRANSLATIONS } from "./i18n";
import "../../css/XrayPortal.css";

const XrayRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(getXrayLanguage);
  const t = XRAY_TRANSLATIONS[lang].register;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    return <Navigate to="/xray/" replace />;
  }

  const canSubmit =
    login.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword &&
    !loading;

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
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
      navigate("/xray/login", { replace: true, state: { registered: true } });
    } catch (err: unknown) {
      let detailedMessage = t.registrationFailed;

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const m = axiosResponseDataMessage(err.response.data);
          detailedMessage = status >= 400 && status < 500 ? m ?? t.checkInput : m ?? t.serverError;
        } else if (err.request) {
          detailedMessage = t.serverUnavailable;
        } else if (err.message) {
          detailedMessage = `Error: ${err.message}`;
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
    <div className="xray-page xray-page--centered">
      <div className="xray-login-shell">
        <div className="xray-language-row">
          <label htmlFor="xray-register-lang" className="xray-language-label">
            Language
          </label>
          <select
            id="xray-register-lang"
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

        <div className="xray-card xray-auth-card">
          <img src="/favicon.png" alt="DataGate" className="xray-logo" />
          <h1 className="xray-title">{t.title}</h1>

          {error && <p className="xray-error">{error}</p>}

          <form onSubmit={handleRegister} className="xray-auth-form">
            <label className="xray-label" htmlFor="xray-display-name">
              {t.displayName}
            </label>
            <input
              id="xray-display-name"
              className="input-login"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
            />

            <label className="xray-label" htmlFor="xray-email">
              {t.email}
            </label>
            <input
              id="xray-email"
              className="input-login"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />

            <label className="xray-label" htmlFor="xray-register-login">
              {t.login}
            </label>
            <input
              id="xray-register-login"
              className="input-login"
              type="text"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
              required
            />

            <label className="xray-label" htmlFor="xray-register-password">
              {t.password}
            </label>
            <PasswordInput
              id="xray-register-password"
              name="xray-register-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-login"
              required
            />

            <label className="xray-label" htmlFor="xray-register-confirm-password">
              {t.confirmPassword}
            </label>
            <PasswordInput
              id="xray-register-confirm-password"
              name="xray-register-confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input-login"
              required
            />

            <button className="btn primary btn-fullwidth" type="submit" disabled={!canSubmit}>
              <FaUserPlus className="icon" /> {loading ? t.creatingAccount : t.createAccount}
            </button>
          </form>

          <div className="register-container">
            <p>
              {t.alreadyHaveAccount} <Link to="/xray/login">{t.signIn}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XrayRegisterPage;
