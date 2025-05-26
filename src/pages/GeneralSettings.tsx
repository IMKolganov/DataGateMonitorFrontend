import { useState, useEffect } from "react";
import { FaSave } from "react-icons/fa";
import "../css/Settings.css";
import { getSetting, setSetting } from "../utils/api";

export function GeneralSettings() {
  const [intervalType, setIntervalType] = useState("seconds");
  const [intervalValue, setIntervalValue] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setInitialLoading(true);
        const intervalSetting = await getSetting("OpenVPN_Polling_Interval");
        const intervalUnit = await getSetting("OpenVPN_Polling_Interval_Unit");
        if (intervalSetting && intervalUnit) {
          setIntervalValue(Number(intervalSetting.value));
          setIntervalType(intervalUnit.value);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Failed to load settings.");
      } finally {
        setInitialLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async (key: string, value: any, type: string) => {
    try {
      setLoading(true);
      await setSetting(key, type === "number" ? String(value) : value, type);
      setSuccessMessage(`${key} successfully updated.`);
      setError(null);
      setErrorDetails(null);
    } catch (err: any) {
      console.error(`Error saving ${key}:`, err);
      setError(`Failed to save ${key}.`);
      setErrorDetails(err.response?.data?.error || err.message);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
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

  return (
    <div>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && (
        <p className="error-message">
          {error}
          <br />
          Details: {errorDetails}
        </p>
      )}

      <h2>OpenVPN Polling Interval</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <h4>OpenVPN Polling Interval:</h4>
      <div className="settings-item">
        <input
          type="number"
          value={intervalValue}
          onChange={(e) => setIntervalValue(Number(e.target.value))}
          className="input"
        />
        <select
          value={intervalType}
          onChange={(e) => setIntervalType(e.target.value)}
          className="btn secondary"
        >
          <option value="seconds">Seconds</option>
          <option value="minutes">Minutes</option>
        </select>
        <button
          className="btn primary"
          onClick={() => handleSave("OpenVPN_Polling_Interval", intervalValue, "int")}
          disabled={loading}
        >
          <span className="icon">{FaSave({ className: "icon" })}</span> Save
        </button>
      </div>
      <p className="settings-item-description">0 = disabled</p>
    </div>
  );
}

export default GeneralSettings;
