import React, { useState } from "react";
import "../../css/Login.css";
import PasswordLoginForm from "./PasswordLoginForm";
import GoogleLoginForm from "./GoogleLoginForm";
import TelegramCodeLoginForm from "./TelegramCodeLoginForm";
import {FaTelegramPlane} from "react-icons/fa";
import {appVersion} from "../../version.ts";

const LoginPage: React.FC = () => {
    const [showTelegramForm, setShowTelegramForm] = useState(false);

    return (
        <div className="login-container">
            <div className="login-wrapper">
                {/* Logo circle */}
                <div className="login-logo-circle"><img src="/favicon.png" alt="Logo" className="logo-icon-login" /></div>

                {/* Title above the card (like GitHub) */}
                <h1 className="login-page-title">Sign in to DataGate Monitor</h1>

                {/* Card */}
                <div className="login">
                    {/* Email / password form */}
                    <PasswordLoginForm />

                    {/* Divider "or" */}
                    <div className="login-divider">
                        <span>or</span>
                    </div>

                    {/* Google button (inside card, full width) */}
                    <div className="social-login">
                        <div className="social-login-item">
                            <GoogleLoginForm />
                        </div>

                        {/* Telegram button */}
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
                            <TelegramCodeLoginForm />
                        </div>
                    )}
                </div>

                {/* Footer under card */}
                <div className="register-container">
                    <p>
                        {/*New to OpenVPN Gate Monitor?{" "}*/}
                        {/*<a href="/register">Create an account</a>*/}
                    </p>
                    <p>© {new Date().getFullYear()} DataGate Monitor v.{appVersion}</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
