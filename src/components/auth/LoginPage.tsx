import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import PasswordLoginForm from "./PasswordLoginForm";
import GoogleLoginForm from "./GoogleLoginForm";
import TelegramCodeLoginForm from "./TelegramCodeLoginForm";
import TotpChallengeForm from "./TotpChallengeForm";
import { FaTelegramPlane, FaSun, FaMoon } from "react-icons/fa";
import { appVersion } from "../../version.ts";
import { useTheme } from "../../contexts/useTheme";
import type { TotpChallengeState } from "../../utils/auth/handleLoginResponse";
import { readRedirectFromSearch } from "../../utils/auth/returnPath";
import {
  logoutReasonMessage,
  readLogoutReasonFromSearch,
} from "../../utils/auth/logoutReason";
import { isAuthenticated } from "../../utils/auth/authSelectors";
import GdprFooterLinks from "../gdpr/GdprFooterLinks";

const LoginPage: React.FC = () => {
    const [showTelegramForm, setShowTelegramForm] = useState(false);
    const [totpChallenge, setTotpChallenge] = useState<TotpChallengeState | null>(null);
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const redirectPath = useMemo(
        () => readRedirectFromSearch(location.search, "/"),
        [location.search],
    );
    const logoutReason = useMemo(
        () => readLogoutReasonFromSearch(location.search),
        [location.search],
    );
    const registerHref =
        redirectPath !== "/"
            ? `/register?redirect=${encodeURIComponent(redirectPath)}`
            : "/register";

    useEffect(() => {
        const state = location.state as { registered?: boolean } | null;
        if (state?.registered) {
            toast.success("Account created successfully. You can now sign in.");
        }
    }, [location.state]);

    useEffect(() => {
        if (!logoutReason) return;
        toast.info(logoutReasonMessage(logoutReason), { autoClose: 8000 });
    }, [logoutReason]);

    const handleTotpBack = () => {
        setTotpChallenge(null);
    };

    if (isAuthenticated()) {
        return <Navigate to={redirectPath} replace />;
    }

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="login-logo-circle"><img src="/favicon.png" alt="Logo" className="logo-icon-login" /></div>

                <h1 className="login-page-title">
                    {totpChallenge
                        ? "Two-factor authentication"
                        : redirectPath.startsWith("/tv/link")
                          ? "Sign in to link your TV"
                          : "Sign in to DataGate Monitor"}
                </h1>

                {logoutReason && !totpChallenge ? (
                    <div
                        className="login-session-notice"
                        role="status"
                        data-testid="logout-reason-notice"
                    >
                        {logoutReasonMessage(logoutReason)}
                    </div>
                ) : null}

                <div className="login">
                    {totpChallenge ? (
                        <TotpChallengeForm
                            loginChallengeId={totpChallenge.loginChallengeId}
                            displayName={totpChallenge.displayName}
                            redirectPath={redirectPath}
                            onBack={handleTotpBack}
                            onBeforeStoreTokens={totpChallenge.onBeforeStoreTokens}
                        />
                    ) : (
                        <>
                            <PasswordLoginForm
                                redirectPath={redirectPath}
                                onTotpChallenge={setTotpChallenge}
                            />

                            <div className="login-divider">
                                <span>or</span>
                            </div>

                            <div className="social-login">
                                <div className="social-login-item">
                                    <GoogleLoginForm
                                        redirectPath={redirectPath}
                                        onTotpChallenge={setTotpChallenge}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="social-button social-button-telegram"
                                    onClick={() => setShowTelegramForm((prev) => !prev)}
                                >
                                    <FaTelegramPlane className="social-button-icon" />
                                    <span>Continue with Telegram</span>
                                </button>
                            </div>

                            {showTelegramForm && (
                                <div className="telegram-form-wrapper">
                                    <TelegramCodeLoginForm
                                        redirectPath={redirectPath}
                                        onTotpChallenge={setTotpChallenge}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="register-container">
                    {!totpChallenge ? (
                        <>
                        <p>
                            New to DataGate Monitor?{" "}
                            <Link to={registerHref} className="register-link">Create an account</Link>
                        </p>
                        <p>
                            Waiting for an email code?{" "}
                            <Link to="/confirm-email" className="register-link">Confirm your email</Link>
                        </p>
                        </>
                    ) : null}
                    <p>© {new Date().getFullYear()} DataGate Monitor v.{appVersion}</p>
                    <GdprFooterLinks />
                    <button
                        type="button"
                        className="login-theme-toggle"
                        onClick={toggleTheme}
                        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                        aria-label={theme === "dark" ? "Light theme" : "Dark theme"}
                    >
                        {theme === "dark" ? <FaSun className="icon" /> : <FaMoon className="icon" />}
                        {theme === "dark" ? "Light theme" : "Dark theme"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
