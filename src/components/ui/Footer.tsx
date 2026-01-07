// src/components/Footer.tsx
import React, { useEffect, useState } from "react";
import { appVersion } from "../../version";
import "../../css/Footer.css";

import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import {
    getTokenRemainingMs,
    formatRemainingTime,
} from "../../utils/auth/tokenExpiration";
import {ACCESS_TOKEN_KEY} from "../../utils/const.ts";

const Footer: React.FC = () => {
    const [remaining, setRemaining] = useState<string | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (!isAdmin(user)) return;

        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) return;

        const update = () => {
            try {
                const ms = getTokenRemainingMs(token);
                setRemaining(formatRemainingTime(ms));
            } catch {
                setRemaining(null);
            }
        };

        update();
        const interval = window.setInterval(update, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <footer className="footer">
            <p>
                © {new Date().getFullYear()} OpenVPN Gate Monitor v.{appVersion}
            </p>

            {remaining && (
                <p className="footer-debug">
                    Admin · session expires in {remaining}
                </p>
            )}
        </footer>
    );
};

export default Footer;
