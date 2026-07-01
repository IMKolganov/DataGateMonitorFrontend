import type { XrayLanguage } from "../../pages/xray/i18n";

export type GdprLanguage = XrayLanguage;

type GdprStrings = {
  bannerTitle: string;
  bannerText: string;
  acceptAll: string;
  rejectNonEssential: string;
  customize: string;
  settingsTitle: string;
  settingsDescription: string;
  categoryEssential: string;
  categoryEssentialDesc: string;
  categoryFunctional: string;
  categoryFunctionalDesc: string;
  categoryThirdParty: string;
  categoryThirdPartyDesc: string;
  alwaysOn: string;
  savePreferences: string;
  privacyPolicy: string;
  cookieSettings: string;
  googleSignInDisabled: string;
  registerPrivacyLabel: string;
  registerPrivacyRequired: string;
  privacyIntroNote: string;
};

const EN: GdprStrings = {
  bannerTitle: "We value your privacy",
  bannerText:
    "We use essential storage for sign-in and optional cookies for UI preferences and Google Sign-In. You can accept all, reject non-essential storage, or customize your choices. See our Privacy Policy for details.",
  acceptAll: "Accept all",
  rejectNonEssential: "Reject non-essential",
  customize: "Customize",
  settingsTitle: "Cookie preferences",
  settingsDescription: "Choose which optional storage categories you allow. Essential storage is always enabled.",
  categoryEssential: "Essential",
  categoryEssentialDesc: "Authentication tokens, security, and core session state required to run the service.",
  categoryFunctional: "Preferences",
  categoryFunctionalDesc: "Map layer, theme-related UI choices, and similar settings stored in your browser.",
  categoryThirdParty: "Third-party sign-in",
  categoryThirdPartyDesc: "Loads Google Identity Services only when you use “Sign in with Google”.",
  alwaysOn: "Always on",
  savePreferences: "Save preferences",
  privacyPolicy: "Privacy Policy",
  cookieSettings: "Cookie settings",
  googleSignInDisabled:
    "Google Sign-In requires third-party cookies. Open cookie settings and enable “Third-party sign-in”.",
  registerPrivacyLabel: "I have read and agree to the",
  registerPrivacyRequired: "You must accept the Privacy Policy to create an account.",
  privacyIntroNote: "",
};

const GDPR_TRANSLATIONS: Record<GdprLanguage, GdprStrings> = {
  en: EN,
  ru: {
    ...EN,
    bannerTitle: "Мы ценим вашу конфиденциальность",
    bannerText:
      "Мы используем обязательное хранилище для входа и необязательные cookie для настроек интерфейса и входа через Google. Вы можете принять все, отклонить необязательные или настроить выбор. Подробности — в Политике конфиденциальности.",
    acceptAll: "Принять все",
    rejectNonEssential: "Только обязательные",
    customize: "Настроить",
    settingsTitle: "Настройки cookie",
    settingsDescription: "Выберите, какие необязательные категории хранения разрешить. Обязательные всегда включены.",
    categoryEssential: "Обязательные",
    categoryEssentialDesc: "Токены авторизации, безопасность и состояние сессии, необходимые для работы сервиса.",
    categoryFunctional: "Настройки",
    categoryFunctionalDesc: "Слой карты, параметры интерфейса и похожие настройки в браузере.",
    categoryThirdParty: "Сторонний вход",
    categoryThirdPartyDesc: "Загружает Google Identity Services только при входе через Google.",
    alwaysOn: "Всегда включено",
    savePreferences: "Сохранить",
    privacyPolicy: "Политика конфиденциальности",
    cookieSettings: "Настройки cookie",
    googleSignInDisabled:
      "Вход через Google требует сторонних cookie. Откройте настройки cookie и включите «Сторонний вход».",
    registerPrivacyLabel: "Я прочитал(а) и согласен(на) с",
    registerPrivacyRequired: "Для регистрации необходимо принять Политику конфиденциальности.",
    privacyIntroNote: "Полный юридический текст политики конфиденциальности приведён на английском языке.",
  },
  de: {
    ...EN,
    bannerTitle: "Wir respektieren Ihre Privatsphäre",
    bannerText:
      "Wir verwenden notwendige Speicherung für die Anmeldung und optionale Cookies für UI-Einstellungen und Google-Anmeldung. Sie können alle akzeptieren, optionale ablehnen oder anpassen. Details in der Datenschutzerklärung.",
    acceptAll: "Alle akzeptieren",
    rejectNonEssential: "Nur notwendige",
    customize: "Anpassen",
    settingsTitle: "Cookie-Einstellungen",
    settingsDescription: "Wählen Sie optionale Speicherkategorien. Notwendige sind immer aktiv.",
    categoryEssential: "Notwendig",
    categoryEssentialDesc: "Authentifizierung, Sicherheit und Sitzungszustand für den Betrieb des Dienstes.",
    categoryFunctional: "Einstellungen",
    categoryFunctionalDesc: "Kartenebene, UI-Optionen und ähnliche Browser-Einstellungen.",
    categoryThirdParty: "Drittanbieter-Anmeldung",
    categoryThirdPartyDesc: "Lädt Google Identity Services nur bei „Mit Google anmelden“.",
    alwaysOn: "Immer aktiv",
    savePreferences: "Speichern",
    privacyPolicy: "Datenschutzerklärung",
    cookieSettings: "Cookie-Einstellungen",
    googleSignInDisabled:
      "Google-Anmeldung erfordert Drittanbieter-Cookies. Öffnen Sie die Cookie-Einstellungen und aktivieren Sie „Drittanbieter-Anmeldung“.",
    registerPrivacyLabel: "Ich habe die",
    registerPrivacyRequired: "Sie müssen die Datenschutzerklärung akzeptieren, um ein Konto zu erstellen.",
    privacyIntroNote: "Der vollständige rechtliche Text der Datenschutzerklärung ist auf Englisch.",
  },
  fr: {
    ...EN,
    bannerTitle: "Nous respectons votre vie privée",
    bannerText:
      "Nous utilisons un stockage essentiel pour la connexion et des cookies optionnels pour les préférences d’interface et la connexion Google. Acceptez tout, refusez l’optionnel ou personnalisez. Voir la Politique de confidentialité.",
    acceptAll: "Tout accepter",
    rejectNonEssential: "Essentiels uniquement",
    customize: "Personnaliser",
    settingsTitle: "Préférences cookies",
    settingsDescription: "Choisissez les catégories optionnelles. Les essentielles restent toujours actives.",
    categoryEssential: "Essentiels",
    categoryEssentialDesc: "Jetons d’authentification, sécurité et état de session nécessaires au service.",
    categoryFunctional: "Préférences",
    categoryFunctionalDesc: "Couche de carte, choix d’interface et paramètres similaires dans le navigateur.",
    categoryThirdParty: "Connexion tierce",
    categoryThirdPartyDesc: "Charge Google Identity Services uniquement pour « Se connecter avec Google ».",
    alwaysOn: "Toujours actif",
    savePreferences: "Enregistrer",
    privacyPolicy: "Politique de confidentialité",
    cookieSettings: "Paramètres cookies",
    googleSignInDisabled:
      "La connexion Google nécessite des cookies tiers. Ouvrez les paramètres cookies et activez « Connexion tierce ».",
    registerPrivacyLabel: "J’ai lu et j’accepte la",
    registerPrivacyRequired: "Vous devez accepter la Politique de confidentialité pour créer un compte.",
    privacyIntroNote: "Le texte juridique complet de la politique de confidentialité est en anglais.",
  },
  el: {
    ...EN,
    bannerTitle: "Σεβόμαστε το απόρρητό σας",
    bannerText:
      "Χρησιμοποιούμε απαραίτητη αποθήκευση για σύνδεση και προαιρετικά cookies για προτιμήσεις UI και σύνδεση Google. Μπορείτε να αποδεχτείτε όλα, να απορρίψετε τα προαιρετικά ή να προσαρμόσετε. Δείτε την Πολιτική Απορρήτου.",
    acceptAll: "Αποδοχή όλων",
    rejectNonEssential: "Μόνο απαραίτητα",
    customize: "Προσαρμογή",
    settingsTitle: "Προτιμήσεις cookies",
    settingsDescription: "Επιλέξτε προαιρετικές κατηγορίες. Τα απαραίτητα είναι πάντα ενεργά.",
    categoryEssential: "Απαραίτητα",
    categoryEssentialDesc: "Διακριτικά αυθεντικοποίησης, ασφάλεια και κατάσταση συνεδρίας για τη λειτουργία.",
    categoryFunctional: "Προτιμήσεις",
    categoryFunctionalDesc: "Επίπεδο χάρτη, επιλογές UI και παρόμοια ρυθμίσεις στο πρόγραμμα περιήγησης.",
    categoryThirdParty: "Σύνδεση τρίτων",
    categoryThirdPartyDesc: "Φορτώνει Google Identity Services μόνο για «Σύνδεση με Google».",
    alwaysOn: "Πάντα ενεργό",
    savePreferences: "Αποθήκευση",
    privacyPolicy: "Πολιτική Απορρήτου",
    cookieSettings: "Ρυθμίσεις cookies",
    googleSignInDisabled:
      "Η σύνδεση Google απαιτεί cookies τρίτων. Ανοίξτε τις ρυθμίσεις cookies και ενεργοποιήστε «Σύνδεση τρίτων».",
    registerPrivacyLabel: "Έχω διαβάσει και συμφωνώ με την",
    registerPrivacyRequired: "Πρέπει να αποδεχτείτε την Πολιτική Απορρήτου για εγγραφή.",
    privacyIntroNote: "Το πλήρες νομικό κείμενο της πολιτικής απορρήτου είναι στα αγγλικά.",
  },
};

export function getGdprStrings(lang: GdprLanguage = "en"): GdprStrings {
  return GDPR_TRANSLATIONS[lang] ?? EN;
}

export function resolveGdprLanguageFromPath(pathname: string): GdprLanguage {
  const useXrayLanguage = pathname.startsWith("/xray") || pathname === "/privacy";
  if (!useXrayLanguage) return "en";
  try {
    const saved = localStorage.getItem("xray.portal.language");
    if (saved === "ru" || saved === "el" || saved === "en" || saved === "fr" || saved === "de") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "en";
}
