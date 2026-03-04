import React, { useState } from "react";

const TelegramCodeLoginForm: React.FC = () => {
    const [code, setCode] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // TODO: implement Telegram code login once API is ready
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="login-item">
                <h4>Telegram code:</h4>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input input-login"
                    required
                    placeholder="Enter code from Telegram bot"
                />
            </div>

            <div className="login-item right">
                <button className="btn primary" type="submit">
                    Sign in with Telegram code
                </button>
            </div>
        </form>
    );
};

export default TelegramCodeLoginForm;
