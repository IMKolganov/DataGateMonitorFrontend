import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../contexts/CookieConsentContext";
import "../../css/CookieConsent.css";

export const CookieSettingsPanel: React.FC = () => {
  const { consent, settingsOpen, strings, savePreferences, closeSettings } = useCookieConsent();
  const [functional, setFunctional] = useState(consent?.functional ?? false);
  const [thirdParty, setThirdParty] = useState(consent?.thirdParty ?? false);

  useEffect(() => {
    if (!settingsOpen) return;
    setFunctional(consent?.functional ?? false);
    setThirdParty(consent?.thirdParty ?? false);
  }, [consent?.functional, consent?.thirdParty, settingsOpen]);

  if (!settingsOpen) return null;

  return (
    <div className="cookie-settings-overlay" role="presentation" onClick={closeSettings}>
      <div
        className="cookie-settings-panel"
        role="dialog"
        aria-labelledby="cookie-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cookie-settings-title" className="cookie-settings-panel__title">
          {strings.settingsTitle}
        </h2>
        <p className="cookie-settings-panel__description">{strings.settingsDescription}</p>

        <div className="cookie-settings-category">
          <div className="cookie-settings-category__header">
            <strong>{strings.categoryEssential}</strong>
            <span className="cookie-settings-badge">{strings.alwaysOn}</span>
          </div>
          <p>{strings.categoryEssentialDesc}</p>
        </div>

        <label className="cookie-settings-category cookie-settings-toggle">
          <div className="cookie-settings-category__header">
            <strong>{strings.categoryFunctional}</strong>
            <input
              type="checkbox"
              checked={functional}
              onChange={(event) => setFunctional(event.target.checked)}
            />
          </div>
          <p>{strings.categoryFunctionalDesc}</p>
        </label>

        <label className="cookie-settings-category cookie-settings-toggle">
          <div className="cookie-settings-category__header">
            <strong>{strings.categoryThirdParty}</strong>
            <input
              type="checkbox"
              checked={thirdParty}
              onChange={(event) => setThirdParty(event.target.checked)}
            />
          </div>
          <p>{strings.categoryThirdPartyDesc}</p>
        </label>

        <p className="cookie-settings-panel__links">
          <Link to="/privacy" className="cookie-consent-link" onClick={closeSettings}>
            {strings.privacyPolicy}
          </Link>
        </p>

        <div className="cookie-settings-panel__actions">
          <button type="button" className="btn secondary" onClick={closeSettings}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => savePreferences({ functional, thirdParty })}
          >
            {strings.savePreferences}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsPanel;
