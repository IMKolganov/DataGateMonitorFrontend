import React, { useEffect, useState } from "react";
import { getAllApplications, registerApplication, fetchConfig } from "../utils/api";
import "../index.css";
import "../css/ApplicationSettings.css";
import { FaPlus, FaSync } from "react-icons/fa";
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

  const loadApplications = async () => {
    setLoading(true);
    try {
      await fetchConfig();
      const data = await getAllApplications();
      setApps(data);
    } catch (error) {
      console.error("Initialization failed:", error);
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
    try {
      const newApp = await registerApplication(newAppName);
      setApps((prevApps) => [
        ...prevApps,
        {
          ...newApp,
          createDate: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
        },
      ]);
      setNewAppName("");
    } catch (error) {
      console.error("Failed to register application", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  return (
    <div className="content-wrapper">
      <h2>Application Settings</h2>

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
            <button className="btn primary" onClick={handleRegister} disabled={loading || !newAppName.trim()}>
              <FaPlus className="icon" /> Register app
            </button>
            <button className="btn secondary" onClick={handleRefresh} disabled={refreshing}>
              <FaSync className={`icon ${refreshing ? "icon-spin" : ""}`} /> Refresh
            </button>
          </div>

          <ApplicationTable applications={apps} refreshApps={loadApplications} />
        </>
      )}
    </div>
  );
}

export default ApplicationSettings;
