import { useState, useEffect } from "react";
import { FaSave } from "react-icons/fa";
import "../css/Settings.css";
import { getSetting, setSetting } from "../utils/api";

export function TelegramBotSettings() {
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
      } catch (err) {
        console.error("Error loading telegram bot settings:", err);
        setError("Failed to load telegram bot settings.");
      } finally {
        setInitialLoading(false);
      }
    }

    fetchSettings();
  }, []);

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

      <h2>Telegram Bot Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <h4>Users:</h4>
      <div className="settings-item">

      </div>
    </div>
  );
}

export default TelegramBotSettings;
