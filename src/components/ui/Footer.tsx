// src/components/ui/Footer.tsx
import React from "react";
import { useSessionDebugLine } from "../../hooks/useSessionDebugLine";
import { appVersion } from "../../version";
import GdprFooterLinks from "../gdpr/GdprFooterLinks";
import "../../css/Footer.css";

const Footer: React.FC = () => {
    const sessionDebugLine = useSessionDebugLine();

    return (
        <footer className="footer">
            <p className="footer-line">
                © {new Date().getFullYear()} DataGate Monitor v.{appVersion}
            </p>
            {sessionDebugLine ? (
                <p className="footer-session-debug" title="Session timers (local debug)">
                    Session: {sessionDebugLine}
                </p>
            ) : null}
            <GdprFooterLinks />
        </footer>
    );
};

export default Footer;
