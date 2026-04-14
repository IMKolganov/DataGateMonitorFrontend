// src/pages/GeneralSettings.tsx
import { useEffect, useMemo, useState } from "react";
import { FaSave, FaSlidersH } from "react-icons/fa";
import "../css/Settings.css";

// orval-generated hooks & types
import {
  useGetApiSettingsGet,
  usePostApiSettingsSet,
} from "../api/orval/settings/settings";
import type {
  GetApiSettingsGetParams,
  PostApiSettingsSetParams,
} from "../api/orval/model";
import { errorMessage } from "../utils/errorMessage";

const KEY_INTERVAL = "OpenVPN_Polling_Interval";
const KEY_UNIT = "OpenVPN_Polling_Interval_Unit";

// Allowed units (keep in sync with backend enum/validation)
const ALLOWED_UNITS = ["seconds", "minutes"] as const;
type Unit = (typeof ALLOWED_UNITS)[number];

export function GeneralSettings() {
  const [intervalType, setIntervalType] = useState<Unit>("seconds");
  const [intervalValue, setIntervalValue] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Load current settings via Orval hooks (two lightweight queries)
  const intervalParams = useMemo<GetApiSettingsGetParams>(
    () => ({ Key: KEY_INTERVAL }),
    []
  );
  const unitParams = useMemo<GetApiSettingsGetParams>(
    () => ({ Key: KEY_UNIT }),
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

  const initialLoading = isLoadingInterval || isLoadingUnit;
  const loading = isFetchingInterval || isFetchingUnit;

  // When responses arrive, hydrate local UI state
  useEffect(() => {
    // safely extract value from either shape
    const intervalRaw = pickSettingValue(intervalResp);
    const val = Number(intervalRaw);
    if (!Number.isNaN(val)) setIntervalValue(val);

    const unitRaw = (pickSettingValue(unitResp) ?? "").toLowerCase();
    if (ALLOWED_UNITS.includes(unitRaw as Unit)) {
      setIntervalType(unitRaw as Unit);
    }
  }, [intervalResp, unitResp]);


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

    try {
      // Save interval value
      const saveIntervalParams: PostApiSettingsSetParams = {
        Key: KEY_INTERVAL,
        // backend expects string value; keep parity with previous behavior
        Value: String(intervalValue),
        Type: "int",
      };

      // Save unit value
      const saveUnitParams: PostApiSettingsSetParams = {
        Key: KEY_UNIT,
        Value: intervalType,
        Type: "string",
      };

      await Promise.all([
        setSettingMutation.mutateAsync({ params: saveIntervalParams }),
        setSettingMutation.mutateAsync({ params: saveUnitParams }),
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

  const anyLoadError = loadIntervalErr || loadUnitErr;

  return (
    <div>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorDetails && !anyLoadError && (
        <p className="error-message">
          {errorDetails}
        </p>
      )}
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
        <div style={{ borderTop: "1px solid #d1d5da" }}></div>

        <div className="settings-item">
          <input
            type="number"
            min={0}
            value={intervalValue}
            onChange={(e) => setIntervalValue(Number(e.target.value))}
            className="input polling-interval-input"
          />

          <select
            value={intervalType}
            onChange={(e) => setIntervalType(e.target.value as Unit)}
            className="btn secondary"
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
    </div>
  );
}

export default GeneralSettings;
