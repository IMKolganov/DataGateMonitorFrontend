import React from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../contexts/CookieConsentContext";
import "../../css/CookieConsent.css";

type GdprFooterLinksProps = {
  className?: string;
};

const GdprFooterLinks: React.FC<GdprFooterLinksProps> = ({ className = "" }) => {
  const { strings, openSettings } = useCookieConsent();

  return (
    <nav className={`gdpr-footer-links ${className}`.trim()} aria-label="Legal">
      <Link to="/privacy">{strings.privacyPolicy}</Link>
      <button type="button" onClick={openSettings}>
        {strings.cookieSettings}
      </button>
    </nav>
  );
};

export default GdprFooterLinks;
