import React, { useEffect, useState } from "react";
import { getAllApplications, registerApplication, revokeApplication, fetchConfig } from "../utils/api";
import "../index.css";
import "../css/ApplicationSettings.css";
import { FaPlus, FaTrash } from "react-icons/fa";

export function ApplicationSettings() {
  const [apps, setApps] = useState<{ clientId: string; name: string }[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
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

    init();
  }, []);

  const handleRegister = async () => {
    if (!newAppName.trim()) return;
    setLoading(true);
    try {
      const newApp = await registerApplication(newAppName);
      setApps((prevApps) => [...prevApps, { clientId: newApp.clientId, name: newAppName }]);
      setNewAppName("");
    } catch (error) {
      console.error("Failed to register application", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (clientId: string) => {
    setLoading(true);
    try {
      await revokeApplication(clientId);
      setApps((prevApps) => prevApps.filter((app) => app.clientId !== clientId));
    } catch (error) {
      console.error("Failed to revoke application", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <h2>Application Settings</h2>

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
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : apps.length === 0 ? (
        <p>No applications registered.</p>
      ) : (
        <ul className="app-list">
          {apps.map((app) => (
            <li key={app.clientId}>
              <span>{app.name}</span>
              <button className="btn danger" onClick={() => handleRevoke(app.clientId)} disabled={loading}>
                <FaTrash className="icon" /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ApplicationSettings;
