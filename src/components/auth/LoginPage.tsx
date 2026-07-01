import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import PasswordLoginForm from "./PasswordLoginForm";
import GoogleLoginForm from "./GoogleLoginForm";
import TelegramCodeLoginForm from "./TelegramCodeLoginForm";
import TotpChallengeForm from "./TotpChallengeForm";
import { FaTelegramPlane, FaSun, FaMoon } from "react-icons/fa";
import { appVersion } from "../../version.ts";
import { useTheme } from "../../contexts/useTheme";
import type { TotpChallengeState } from "../../utils/auth/handleLoginResponse";
import GdprFooterLinks from "../gdpr/GdprFooterLinks";

const LoginPage: React.FC = () => {
    const [showTelegramForm, setShowTelegramForm] = useState(false);
    const [totpChallenge, setTotpChallenge] = useState<TotpChallengeState | null>(null);
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const state = location.state as { registered?: boolean } | null;
        if (state?.registered) {
            toast.success("Account created successfully. You can now sign in.");
        }
    }, [location.state]);

    const handleTotpBack = () => {
        setTotpChallenge(null);
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="login-logo-circle"><img src="/favicon.png" alt="Logo" className="logo-icon-login" /></div>

                <h1 className="login-page-title">
                    {totpChallenge ? "Two-factor authentication" : "Sign in to DataGate Monitor"}
                </h1>

                <div className="login">
                    {totpChallenge ? (
                        <TotpChallengeForm
                            loginChallengeId={totpChallenge.loginChallengeId}
                            displayName={totpChallenge.displayName}
                            onBack={handleTotpBack}
                            onBeforeStoreTokens={totpChallenge.onBeforeStoreTokens}
                        />
                    ) : (
                        <>
                            <PasswordLoginForm onTotpChallenge={setTotpChallenge} />

                            <div className="login-divider">
                                <span>or</span>
                            </div>

                            <div className="social-login">
                                <div className="social-login-item">
                                    <GoogleLoginForm onTotpChallenge={setTotpChallenge} />
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
                                    <TelegramCodeLoginForm onTotpChallenge={setTotpChallenge} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="register-container">
                    {!totpChallenge ? (
                        <p>
                            New to DataGate Monitor?{" "}
                            <Link to="/register" className="register-link">Create an account</Link>
                        </p>
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
