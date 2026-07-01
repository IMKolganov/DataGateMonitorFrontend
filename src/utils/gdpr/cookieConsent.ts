import Cookies from "js-cookie";

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = "datagate.cookieConsent";

export const PREFERENCE_COOKIE_KEYS = [
  "selectedMapLayer",
  "selectedPointColor",
  "selectedMapViewMode",
  "selectedMapPerformanceMode",
  "selectedGlobeTrafficLayer",
  "geoPointStyle",
  "geoPointColor",
] as const;

export interface CookieConsentState {
  essential: true;
  functional: boolean;
  thirdParty: boolean;
  decidedAt: string;
  version: number;
}

export type CookieConsentInput = Pick<CookieConsentState, "functional" | "thirdParty">;

function parseConsent(raw: string | null): CookieConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      typeof parsed.functional !== "boolean" ||
      typeof parsed.thirdParty !== "boolean" ||
      typeof parsed.decidedAt !== "string"
    ) {
      return null;
    }
    return {
      essential: true,
      functional: parsed.functional,
      thirdParty: parsed.thirdParty,
      decidedAt: parsed.decidedAt,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

export function getCookieConsent(): CookieConsentState | null {
  try {
    return parseConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasConsentDecision(): boolean {
  return getCookieConsent() !== null;
}

export function acceptsFunctional(): boolean {
  return getCookieConsent()?.functional === true;
}

export function acceptsThirdParty(): boolean {
  return getCookieConsent()?.thirdParty === true;
}

export function clearPreferenceCookies(): void {
  for (const key of PREFERENCE_COOKIE_KEYS) {
    Cookies.remove(key);
  }
}

export function setCookieConsent(input: CookieConsentInput): CookieConsentState {
  const previous = getCookieConsent();
  const next: CookieConsentState = {
    essential: true,
    functional: input.functional,
    thirdParty: input.thirdParty,
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));

  if (!next.functional && (previous?.functional || !previous)) {
    clearPreferenceCookies();
  }

  if (!next.thirdParty) {
    removeGoogleIdentityScript();
  }

  return next;
}

export function setPreferenceCookie(name: string, value: string): void {
  if (!acceptsFunctional()) return;
  Cookies.set(name, value, { expires: 365 });
}

export function getPreferenceCookie(name: string): string | undefined {
  return Cookies.get(name);
}

const GOOGLE_SCRIPT_ID = "google-identity-script";

export function removeGoogleIdentityScript(): void {
  document.getElementById(GOOGLE_SCRIPT_ID)?.remove();
  try {
    delete (window as Window & { google?: unknown }).google;
  } catch {
    (window as Window & { google?: unknown }).google = undefined;
  }
}
