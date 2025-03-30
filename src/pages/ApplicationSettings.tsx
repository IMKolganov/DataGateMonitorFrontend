import React, { useEffect, useState } from "react";
import { getAllApplications, registerApplication, fetchConfig } from "../utils/api";
import { FaPlus, FaSync } from "react-icons/fa";
import "../css/ApplicationSettings.css";
import ApplicationTable from "../components/ApplicationTable";

interface Application {
  clientId: string;
  name: string;
  clientSecret: string;
  isRevoked: boolean;
  lastUpdate: string;
  createDate: string;
}

export function ApplicationSettings() {
  const [apps, setApps] = useState<Application[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await fetchConfig();
      const data = await getAllApplications();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected response format");
      }
      setApps(data);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleRegister = async () => {
    if (!newAppName.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const newApp = await registerApplication(newAppName);
      if (!newApp || !newApp.clientId) {
        throw new Error("Invalid response from server");
      }
      setApps((prevApps) => [
        ...prevApps,
        {
          ...newApp,
          createDate: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
        },
      ]);
      setNewAppName("");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to register application");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  return (
    <div>
      <h2>Application Settings</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <p className="app-settings-description">
        Manage applications that require API access. Each registered application receives a unique{" "}
        <strong>Client ID</strong> and <strong>Client Secret</strong>.
        These credentials can be used to authenticate API requests.
      </p>

      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading applications...</p>
        </div>
      ) : (
        <>
          <div className="app-register">
            <input
              type="text"
              placeholder="Application Name"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              disabled={loading}
              className="input"
            />
            <button
              className="btn primary"
              onClick={handleRegister}
              disabled={loading || !newAppName.trim()}
            >
              <FaPlus className="icon" /> Register app
            </button>
          </div>

          {errorMessage && (
            <div>
              <p className="error-message">❌ {errorMessage}</p>
            </div>
          )}

          <ApplicationTable applications={apps} refreshApps={loadApplications} />
        </>
      )}

      <div className="app-warning">
        <p>
          ⚠️ <strong>Security Notice:</strong> The <code>clientSecret</code> is displayed only once
          upon creation. Make sure to store it securely!
        </p>
      </div>

      <h3>Example: Authenticate with API</h3>
      <pre className="code-block">
        {`curl -X POST https://api.example.com/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'`}
      </pre>
    </div>
  );
}

export default ApplicationSettings;
