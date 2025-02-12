import React, { useEffect, useState } from "react";
import axios from "axios";
import { ConnectedClient } from "../utils/types";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import { FaSync } from "react-icons/fa";

interface Config {
  apiBaseUrl: string;
}

const History: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchHistoryClients();
    }
  }, [config]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const fetchHistoryClients = async () => {
    if (!config) return;
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<ConnectedClient[]>(`${config.apiBaseUrl}/OpenVpnServers/GetAllHistoryClients`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching history clients", error);
      setError("Failed to load history clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper wide-table" style={{ padding: "20px" }}>
      <h2>VPN Connection History</h2>
      <div style={{borderTop: "1px solid #d1d5da",  marginTop: "5px", padding: "5px"}}></div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <button
          className="btn secondary"
          onClick={fetchHistoryClients}
          disabled={loading}
        >
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <ClientsTable clients={clients} />
      <h2>Historical VPN Client Locations</h2>
      <div style={{borderTop: "1px solid #d1d5da"}}></div>
      <VpnMap clients={clients} />

    </div>
  );
};

export default History;
