import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../css/Settings.css";
import { getSetting, setSetting } from "../utils/api"; // API-функции для работы с настройками

export function Settings() {
  const navigate = useNavigate();
  const [intervalType, setIntervalType] = useState<string>("seconds"); // seconds or minutes
  const [intervalValue, setIntervalValue] = useState<number>(30); // Default: 30 seconds
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntervalSetting() {
      try {
        setLoading(true);
        const intervalSetting = await getSetting("OpenVPN_Polling_Interval");
        const intervalUnit = await getSetting("OpenVPN_Polling_Interval_Unit");

        if (intervalSetting && intervalUnit) {
          setIntervalValue(Number(intervalSetting.value));
          setIntervalType(intervalUnit.value);
        }
      } catch (err) {
        console.error("Error loading interval setting:", err);
        setError("Failed to load polling interval settings.");
      } finally {
        setLoading(false);
      }
    }

    fetchIntervalSetting();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      await setSetting("OpenVPN_Polling_Interval", String(intervalValue), "int");
      await setSetting("OpenVPN_Polling_Interval_Unit", intervalType, "string");
      setError(null);
    } catch (err) {
      console.error("Error saving interval setting:", err);
      setError("Failed to save polling interval settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper wide-table settings">
      <h2>Settings</h2>
      <div className="header-container">
        <p className="settings-description">
          This page allows you to manage various aspects of the system. You can configure application settings and other parameters here.
        </p>
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              <FaArrowLeft className="icon" /> Back
            </button>
          </div>
        </div>
      </div>

      <ul className="settings-links">
        <li>
          <Link to="/settings/applications">Application Settings</Link>
          <p className="settings-item-description">
            Manage registered applications, generate API tokens, and configure access permissions.
          </p>
        </li>
      </ul>

      <h3>OpenVPN Polling Interval</h3>
      <p className="settings-item-description">
        Define how often the system retrieves data from OpenVPN via Telnet.
      </p>
      <div className="interval-settings">
        <input
          type="number"
          value={intervalValue}
          onChange={(e) => setIntervalValue(Number(e.target.value))}
          min="1"
          className="input"
        />
        <select value={intervalType} onChange={(e) => setIntervalType(e.target.value)} className="dropdown">
          <option value="seconds">Seconds</option>
          <option value="minutes">Minutes</option>
        </select>
        <button className="btn primary" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Settings;
