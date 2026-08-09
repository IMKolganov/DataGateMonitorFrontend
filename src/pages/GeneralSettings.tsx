// src/pages/GeneralSettings.tsx
import { useMemo, useState } from "react";
import { FaSave, FaSlidersH } from "react-icons/fa";
import "../css/Settings.css";

// orval-generated hooks & types
import {
  useGetApiSettingsGet,
  usePostApiSettingsSet,
} from "../api/orval/settings/settings";
import { errorMessage } from "../utils/errorMessage";

const KEY_INTERVAL = "OpenVPN_Polling_Interval";
const KEY_UNIT = "OpenVPN_Polling_Interval_Unit";
const KEY_REQUIRE_EMAIL_CONFIRMATION = "Auth_Require_Email_Confirmation_On_Register";
const KEY_EMAIL_CONFIRMATION_CODE_TTL_MINUTES = "Auth_Email_Confirmation_Code_Ttl_Minutes";
const KEY_ALLOW_FREE_TIER_GRACE = "FreeTier_Allow_Grace_Without_Compliance";
const KEY_FREE_TIER_GRACE_MINUTES = "FreeTier_Grace_Period_Minutes";

// Allowed units (keep in sync with backend enum/validation)
const ALLOWED_UNITS = ["seconds", "minutes"] as const;
type Unit = (typeof ALLOWED_UNITS)[number];

export function GeneralSettings() {
  const [intervalType, setIntervalType] = useState<Unit>("seconds");
  const [intervalValue, setIntervalValue] = useState<number>(0);
  const [requireEmailConfirmation, setRequireEmailConfirmation] = useState<boolean>(true);
  const [emailConfirmationCodeTtlMinutes, setEmailConfirmationCodeTtlMinutes] = useState<number>(30);
  const [allowFreeTierGrace, setAllowFreeTierGrace] = useState<boolean>(false);
  const [freeTierGraceMinutes, setFreeTierGraceMinutes] = useState<number>(5);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Load current settings via Orval hooks (two lightweight queries)
  const intervalParams = useMemo(
    () => ({ Key: KEY_INTERVAL }),
    []
  );
  const unitParams = useMemo(
    () => ({ Key: KEY_UNIT }),
    []
  );
  const requireEmailConfirmationParams = useMemo(
    () => ({ Key: KEY_REQUIRE_EMAIL_CONFIRMATION }),
    []
  );
  const emailConfirmationCodeTtlMinutesParams = useMemo(
    () => ({ Key: KEY_EMAIL_CONFIRMATION_CODE_TTL_MINUTES }),
    []
  );
  const allowFreeTierGraceParams = useMemo(
    () => ({ Key: KEY_ALLOW_FREE_TIER_GRACE }),
    []
  );
  const freeTierGraceMinutesParams = useMemo(
    () => ({ Key: KEY_FREE_TIER_GRACE_MINUTES }),
    []
  );

  function pickSettingValue(resp: unknown): string | undefined {
    if (resp == null || typeof resp !== "object") return undefined;
    const r = resp as Record<string, unknown>;
    const data = r["data"] as Record<string, unknown> | undefined;
    const setting = r["setting"] as Record<string, unknown> | undefined;
    const dataSetting = data?.["setting"] as Record<string, unknown> | undefined;
    const v =
      r["value"] ??
      data?.["value"] ??
      dataSetting?.["value"] ??
      setting?.["value"];
    return typeof v === "string" ? v : v != null ? String(v) : undefined;
  }

  const {
    data: intervalResp,
    isFetching: isFetchingInterval,
    isLoading: isLoadingInterval,
    error: loadIntervalErr,
  } = useGetApiSettingsGet(intervalParams, {
    query: {
      // No v5 keepPreviousData; keep it simple and just fetch
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });

  const {
    data: unitResp,
    isFetching: isFetchingUnit,
    isLoading: isLoadingUnit,
    error: loadUnitErr,
  } = useGetApiSettingsGet(unitParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });
  const {
    data: requireEmailConfirmationResp,
    isFetching: isFetchingRequireEmailConfirmation,
    isLoading: isLoadingRequireEmailConfirmation,
    error: loadRequireEmailConfirmationErr,
  } = useGetApiSettingsGet(requireEmailConfirmationParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });
  const {
    data: emailConfirmationCodeTtlMinutesResp,
    isFetching: isFetchingEmailConfirmationCodeTtlMinutes,
    isLoading: isLoadingEmailConfirmationCodeTtlMinutes,
    error: loadEmailConfirmationCodeTtlMinutesErr,
  } = useGetApiSettingsGet(emailConfirmationCodeTtlMinutesParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });
  const {
    data: allowFreeTierGraceResp,
    isFetching: isFetchingAllowFreeTierGrace,
    isLoading: isLoadingAllowFreeTierGrace,
    error: loadAllowFreeTierGraceErr,
  } = useGetApiSettingsGet(allowFreeTierGraceParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });
  const {
    data: freeTierGraceMinutesResp,
    isFetching: isFetchingFreeTierGraceMinutes,
    isLoading: isLoadingFreeTierGraceMinutes,
    error: loadFreeTierGraceMinutesErr,
  } = useGetApiSettingsGet(freeTierGraceMinutesParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });

  const initialLoading =
    isLoadingInterval ||
    isLoadingUnit ||
    isLoadingRequireEmailConfirmation ||
    isLoadingEmailConfirmationCodeTtlMinutes ||
    isLoadingAllowFreeTierGrace ||
    isLoadingFreeTierGraceMinutes;
  const loading =
    isFetchingInterval ||
    isFetchingUnit ||
    isFetchingRequireEmailConfirmation ||
    isFetchingEmailConfirmationCodeTtlMinutes ||
    isFetchingAllowFreeTierGrace ||
    isFetchingFreeTierGraceMinutes;

  const settingsSnapshotKey = useMemo(() => {
    return JSON.stringify({
      interval: pickSettingValue(intervalResp),
      unit: pickSettingValue(unitResp),
      requireEmailConfirmation: pickSettingValue(requireEmailConfirmationResp),
      ttl: pickSettingValue(emailConfirmationCodeTtlMinutesResp),
      allowFreeTierGrace: pickSettingValue(allowFreeTierGraceResp),
      freeTierGraceMinutes: pickSettingValue(freeTierGraceMinutesResp),
    });
  }, [intervalResp, unitResp, requireEmailConfirmationResp, emailConfirmationCodeTtlMinutesResp, allowFreeTierGraceResp, freeTierGraceMinutesResp]);

  const [appliedSettingsKey, setAppliedSettingsKey] = useState("");
  if (settingsSnapshotKey !== appliedSettingsKey && !initialLoading) {
    setAppliedSettingsKey(settingsSnapshotKey);

    const intervalRaw = pickSettingValue(intervalResp);
    const val = Number(intervalRaw);
    if (!Number.isNaN(val)) setIntervalValue(val);

    const unitRaw = (pickSettingValue(unitResp) ?? "").toLowerCase();
    if (ALLOWED_UNITS.includes(unitRaw as Unit)) {
      setIntervalType(unitRaw as Unit);
    }

    const requireEmailConfirmationRaw =
      (pickSettingValue(requireEmailConfirmationResp) ?? "").toLowerCase();
    if (requireEmailConfirmationRaw === "true") {
      setRequireEmailConfirmation(true);
    } else if (requireEmailConfirmationRaw === "false") {
      setRequireEmailConfirmation(false);
    }

    const ttlRaw = Number(pickSettingValue(emailConfirmationCodeTtlMinutesResp));
    if (!Number.isNaN(ttlRaw)) {
      setEmailConfirmationCodeTtlMinutes(ttlRaw);
    }

    const allowFreeTierGraceRaw =
      (pickSettingValue(allowFreeTierGraceResp) ?? "").toLowerCase();
    if (allowFreeTierGraceRaw === "true") {
      setAllowFreeTierGrace(true);
    } else if (allowFreeTierGraceRaw === "false") {
      setAllowFreeTierGrace(false);
    }

    const graceMinutesRaw = Number(pickSettingValue(freeTierGraceMinutesResp));
    if (!Number.isNaN(graceMinutesRaw)) {
      setFreeTierGraceMinutes(graceMinutesRaw);
    }
  }


  // Orval mutation for setting values
  const setSettingMutation = usePostApiSettingsSet();

  const handleSave = async () => {
    setSuccessMessage(null);
    setErrorDetails(null);

    // Basic front-end validation
    if (!ALLOWED_UNITS.includes(intervalType)) {
      setErrorDetails("Unsupported unit. Allowed: seconds | minutes.");
      return;
    }
    if (!Number.isFinite(intervalValue) || intervalValue < 0) {
      setErrorDetails("Interval value must be a non-negative number.");
      return;
    }
    if (!Number.isFinite(emailConfirmationCodeTtlMinutes) || emailConfirmationCodeTtlMinutes < 1) {
      setErrorDetails("Email confirmation code lifetime must be at least 1 minute.");
      return;
    }
    if (!Number.isFinite(freeTierGraceMinutes) || freeTierGraceMinutes < 1) {
      setErrorDetails("Free tier grace period must be at least 1 minute.");
      return;
    }

    try {
      // Save interval value
      const saveIntervalParams = {
        Key: KEY_INTERVAL,
        // backend expects string value; keep parity with previous behavior
        Value: String(intervalValue),
        Type: "int",
      };

      // Save unit value
      const saveUnitParams = {
        Key: KEY_UNIT,
        Value: intervalType,
        Type: "string",
      };
      const saveRequireEmailConfirmationParams = {
        Key: KEY_REQUIRE_EMAIL_CONFIRMATION,
        Value: String(requireEmailConfirmation),
        Type: "bool",
      };
      const saveEmailConfirmationCodeTtlMinutesParams = {
        Key: KEY_EMAIL_CONFIRMATION_CODE_TTL_MINUTES,
        Value: String(emailConfirmationCodeTtlMinutes),
        Type: "int",
      };
      const saveAllowFreeTierGraceParams = {
        Key: KEY_ALLOW_FREE_TIER_GRACE,
        Value: String(allowFreeTierGrace),
        Type: "bool",
      };
      const saveFreeTierGraceMinutesParams = {
        Key: KEY_FREE_TIER_GRACE_MINUTES,
        Value: String(freeTierGraceMinutes),
        Type: "int",
      };

      await Promise.all([
        setSettingMutation.mutateAsync({ params: saveIntervalParams }),
        setSettingMutation.mutateAsync({ params: saveUnitParams }),
        setSettingMutation.mutateAsync({ params: saveRequireEmailConfirmationParams }),
        setSettingMutation.mutateAsync({ params: saveEmailConfirmationCodeTtlMinutesParams }),
        setSettingMutation.mutateAsync({ params: saveAllowFreeTierGraceParams }),
        setSettingMutation.mutateAsync({ params: saveFreeTierGraceMinutesParams }),
      ]);

      setSuccessMessage("Settings successfully updated.");
    } catch (e: unknown) {
      setErrorDetails(errorMessage(e));
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  const anyLoadError =
    loadIntervalErr ||
    loadUnitErr ||
    loadRequireEmailConfirmationErr ||
    loadEmailConfirmationCodeTtlMinutesErr ||
    loadAllowFreeTierGraceErr ||
    loadFreeTierGraceMinutesErr;

  return (
    <div>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorDetails && !anyLoadError && (
        <p className="error-message">
          {errorDetails}
        </p>
      )}

      <div className="settings-polling">
        <h2 className="settings-page__h2-with-icon">
          <FaSlidersH className="icon" aria-hidden />
          <span>OpenVPN Polling Interval</span>
        </h2>
        <div className="settings-divider" />

        <div className="settings-item">
          <input
            id="openvpn-polling-interval-value"
            name="openvpnPollingIntervalValue"
            type="number"
            min={0}
            value={intervalValue}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
            className="input polling-interval-input"
          />

          <select
            id="openvpn-polling-interval-unit"
            name="openvpnPollingIntervalUnit"
            value={intervalType}
            onChange={(e) => setIntervalType(e.target.value as Unit)}
            className="input dropdown-select"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
          </select>

          <button
            className="btn primary"
            onClick={handleSave}
            disabled={loading || setSettingMutation.isPending}
          >
            <FaSave className="icon" aria-hidden /> Save
          </button>
        </div>

        <p className="settings-item-description">
          Interval for the backend service that runs on the server and periodically polls VPN servers for status and data. 0 = disabled.
        </p>
      </div>

      <div className="settings-polling">
        <h2 className="settings-page__h2-with-icon">
          <FaSlidersH className="icon" aria-hidden />
          <span>Authentication</span>
        </h2>
        <div className="settings-divider" />

        <label className="settings-item settings-item--gap-10">
          <input
            id="require-email-confirmation"
            name="requireEmailConfirmation"
            type="checkbox"
            checked={requireEmailConfirmation}
            onChange={(e) => setRequireEmailConfirmation(e.target.checked)}
          />
          <span>Require email confirmation for password registration</span>
        </label>

        <p className="settings-item-description">
          If enabled, users registering with login/password must confirm email before sign-in.
          Google sign-in is not affected.
        </p>

        <div className="settings-item settings-item--mt-12">
          <label htmlFor="email-confirmation-code-ttl" className="settings-item-label--320">
            Email confirmation code lifetime (minutes)
          </label>
          <input
            id="email-confirmation-code-ttl"
            type="number"
            min={1}
            max={1440}
            value={emailConfirmationCodeTtlMinutes}
            onChange={(e) => setEmailConfirmationCodeTtlMinutes(Number(e.target.value))}
            className="input polling-interval-input"
          />
        </div>

        <div className="settings-item settings-item--mt-12">
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={loading || setSettingMutation.isPending}
          >
            <FaSave className="icon" aria-hidden /> Save
          </button>
        </div>
      </div>

      <div className="settings-polling">
        <h2 className="settings-page__h2-with-icon">
          <FaSlidersH className="icon" aria-hidden />
          <span>Free tier VPN access</span>
        </h2>
        <div className="settings-divider" />

        <label className="settings-item settings-item--gap-10">
          <input
            id="allow-free-tier-grace"
            name="allowFreeTierGrace"
            type="checkbox"
            checked={allowFreeTierGrace}
            onChange={(e) => setAllowFreeTierGrace(e.target.checked)}
          />
          <span>
            Allow temporary VPN access without channel subscription
          </span>
        </label>

        <p className="settings-item-description">
          When enabled, users on Free/Default plans may receive VPN configs for a short grace
          period even if they are not subscribed to the required Telegram channel. Disconnect
          enforcement respects the active grace window and may disconnect them after it expires.
        </p>

        <div className="settings-item settings-item--mt-12">
          <label htmlFor="free-tier-grace-minutes" className="settings-item-label--320">
            Grace period (minutes)
          </label>
          <input
            id="free-tier-grace-minutes"
            type="number"
            min={1}
            max={60}
            value={freeTierGraceMinutes}
            onChange={(e) => setFreeTierGraceMinutes(Number(e.target.value))}
            className="input polling-interval-input"
          />
        </div>

        <div className="settings-item settings-item--mt-12">
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={loading || setSettingMutation.isPending}
          >
            <FaSave className="icon" aria-hidden /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default GeneralSettings;
