import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../contexts/CookieConsentContext";
import "../../css/CookieConsent.css";

export const CookieConsentBanner: React.FC = () => {
  const { hasDecision, strings, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();
  const [visible, setVisible] = useState(() => !hasDecision);

  useEffect(() => {
    setVisible(!hasDecision);
  }, [hasDecision]);

  if (!visible) return null;

  return (
    <div className="cookie-consent-banner" role="dialog" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent-banner__content">
        <h2 id="cookie-consent-title" className="cookie-consent-banner__title">
          {strings.bannerTitle}
        </h2>
        <p className="cookie-consent-banner__text">{strings.bannerText}</p>
        <p className="cookie-consent-banner__links">
          <Link to="/privacy" className="cookie-consent-link">
            {strings.privacyPolicy}
          </Link>
        </p>
      </div>
      <div className="cookie-consent-banner__actions">
        <button type="button" className="btn secondary cookie-consent-btn" onClick={rejectNonEssential}>
          {strings.rejectNonEssential}
        </button>
        <button type="button" className="btn secondary cookie-consent-btn" onClick={openSettings}>
          {strings.customize}
        </button>
        <button type="button" className="btn primary cookie-consent-btn" onClick={acceptAll}>
          {strings.acceptAll}
        </button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
