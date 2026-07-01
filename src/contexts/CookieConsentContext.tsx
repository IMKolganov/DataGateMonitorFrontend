import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentInput,
  type CookieConsentState,
} from "../utils/gdpr/cookieConsent";
import { getGdprStrings, resolveGdprLanguageFromPath } from "../utils/gdpr/i18n";

type CookieConsentContextValue = {
  consent: CookieConsentState | null;
  hasDecision: boolean;
  settingsOpen: boolean;
  strings: ReturnType<typeof getGdprStrings>;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (input: CookieConsentInput) => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [consent, setConsent] = useState<CookieConsentState | null>(() => getCookieConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lang = resolveGdprLanguageFromPath(location.pathname);
  const strings = useMemo(() => getGdprStrings(lang), [lang]);

  const applyConsent = useCallback((input: CookieConsentInput) => {
    const next = setCookieConsent(input);
    setConsent(next);
    setSettingsOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecision: consent !== null,
      settingsOpen,
      strings,
      acceptAll: () => applyConsent({ functional: true, thirdParty: true }),
      rejectNonEssential: () => applyConsent({ functional: false, thirdParty: false }),
      savePreferences: applyConsent,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [applyConsent, consent, settingsOpen, strings],
  );

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}
