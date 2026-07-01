import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaEnvelope } from "react-icons/fa";
import { resolveGdprLanguageFromPath, getGdprStrings } from "../utils/gdpr/i18n";
import "../css/InfoPages.css";

const CONTACT_EMAIL = "imkolganov@gmail.com";

const PrivacyPolicy: React.FC = () => {
  const location = useLocation();
  const lang = resolveGdprLanguageFromPath(location.pathname);
  const gdpr = getGdprStrings(lang);
  const backToXray = location.pathname.startsWith("/xray") || document.referrer.includes("/xray");

  return (
    <div className="content-wrapper wide-table info-page privacy-page">
      <h2>Privacy Policy</h2>
      <hr className="info-divider" />
      {gdpr.privacyIntroNote ? (
        <p className="info-note">{gdpr.privacyIntroNote}</p>
      ) : null}
      <p>
        <strong>Last updated:</strong> July 1, 2026
      </p>
      <p>
        This Privacy Policy explains how <strong>DataGate Monitor</strong> and the public{" "}
        <strong>XRay access portal</strong> (including pages under <code>/xray</code>) process personal
        data when you use <code>dash.datagateapp.com</code> and related services operated by Ivan Kolganov
        (“we”, “us”).
      </p>

      <section className="info-section">
        <p>
          <strong>1. Data we process</strong>
        </p>
        <ul>
          <li>Account data: login, display name, email address, password hash, and authentication tokens.</li>
          <li>
            Third-party sign-in data: when you use Google Sign-In, we receive profile identifiers and email
            from Google to authenticate you.
          </li>
          <li>
            VPN / XRay service data: server assignments, generated access links, connection metadata needed
            to provide the service.
          </li>
          <li>
            Technical data: IP address, browser type, timestamps, and security logs required to operate and
            protect the platform.
          </li>
          <li>
            Optional UI preferences stored in your browser (for example map layer selection) when you consent
            to preference storage.
          </li>
        </ul>
      </section>

      <section className="info-section">
        <p>
          <strong>2. Purposes and legal bases (GDPR)</strong>
        </p>
        <ul>
          <li>
            <strong>Contract / service delivery</strong> — creating and managing your account, issuing XRay
            access, and operating the monitoring dashboard.
          </li>
          <li>
            <strong>Legitimate interests</strong> — security monitoring, fraud prevention, and service
            reliability, balanced against your rights.
          </li>
          <li>
            <strong>Consent</strong> — optional browser storage for UI preferences and loading Google
            Identity Services for “Sign in with Google”.
          </li>
          <li>
            <strong>Legal obligation</strong> — where applicable law requires retention or disclosure.
          </li>
        </ul>
      </section>

      <section className="info-section">
        <p>
          <strong>3. Cookies and local storage</strong>
        </p>
        <p>We use the following categories:</p>
        <ul>
          <li>
            <strong>Essential</strong> — authentication tokens, session security, and core application state.
            These are required and do not require consent.
          </li>
          <li>
            <strong>Preferences</strong> — optional settings such as map display choices. Stored only after
            you accept preference storage in the cookie banner.
          </li>
          <li>
            <strong>Third-party sign-in</strong> — Google Identity Services script loaded only if you enable
            this category and choose Google Sign-In.
          </li>
        </ul>
        <p>
          You can change your choices at any time via <strong>Cookie settings</strong> in the site footer or
          the consent banner.
        </p>
      </section>

      <section className="info-section">
        <p>
          <strong>4. Recipients and international transfers</strong>
        </p>
        <p>
          We use infrastructure and subprocessors needed to host the service. If you enable Google Sign-In,
          Google LLC processes data according to{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google&apos;s Privacy Policy
          </a>
          . Where data is transferred outside the EEA, we rely on appropriate safeguards such as Standard
          Contractual Clauses where required.
        </p>
      </section>

      <section className="info-section">
        <p>
          <strong>5. Retention</strong>
        </p>
        <p>
          Account and service data are kept while your account is active and as needed for security, billing,
          or legal compliance. Authentication logs and operational records are retained for a limited period
          aligned with security needs.
        </p>
      </section>

      <section className="info-section">
        <p>
          <strong>6. Your rights</strong>
        </p>
        <p>
          If you are in the EEA, UK, or Switzerland, you may have the right to access, rectify, erase,
          restrict, or object to processing, and to data portability. Where processing is based on consent,
          you may withdraw consent at any time without affecting prior lawful processing. You may lodge a
          complaint with your local supervisory authority.
        </p>
      </section>

      <section className="info-section">
        <p>
          <strong>7. Contact</strong>
        </p>
        <p className="info-list-item">
          <FaEnvelope className="info-icon" aria-hidden />
          Data protection contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <p className="info-note">
        {backToXray ? (
          <>
            Return to <Link to="/xray/login">XRay portal sign-in</Link> or{" "}
            <Link to="/login">admin sign-in</Link>.
          </>
        ) : (
          <>
            Return to <Link to="/login">sign-in</Link> or <Link to="/xray/login">XRay portal</Link>.
          </>
        )}
      </p>
    </div>
  );
};

export default PrivacyPolicy;
