import { beforeEach, describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  acceptsFunctional,
  acceptsThirdParty,
  getCookieConsent,
  hasConsentDecision,
  setCookieConsent,
} from "./cookieConsent";

describe("cookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts without a stored decision", () => {
    expect(hasConsentDecision()).toBe(false);
    expect(getCookieConsent()).toBeNull();
    expect(acceptsFunctional()).toBe(false);
    expect(acceptsThirdParty()).toBe(false);
  });

  it("persists accept-all preferences", () => {
    const saved = setCookieConsent({ functional: true, thirdParty: true });
    expect(saved.functional).toBe(true);
    expect(saved.thirdParty).toBe(true);
    expect(saved.version).toBe(COOKIE_CONSENT_VERSION);
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toContain('"functional":true');
    expect(acceptsFunctional()).toBe(true);
    expect(acceptsThirdParty()).toBe(true);
  });

  it("persists reject-non-essential preferences", () => {
    setCookieConsent({ functional: false, thirdParty: false });
    expect(acceptsFunctional()).toBe(false);
    expect(acceptsThirdParty()).toBe(false);
  });
});
