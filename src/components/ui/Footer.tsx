// src/components/ui/Footer.tsx
import React from "react";
import { appVersion } from "../../version";
import "../../css/Footer.css";

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <p className="footer-line">
                © {new Date().getFullYear()} DataGate Monitor v.{appVersion}
            </p>
        </footer>
    );
};

export default Footer;
