import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { FaSync, FaSave } from "react-icons/fa";
import { ServerInfo, ConnectedClient } from "../components/types";
import ServerInfoComponent from "../components/ServerInfo";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServiceControls from "../components/ServiceControls";
import NextRefreshTimer from "../components/NextRefreshTimer";

interface Config {
  apiBaseUrl: string;
  webSocketUrl: string;
  defaultRefreshInterval: number;
}

export function Dashboard() {
  const [config, setConfig] = useState<Config | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [serviceStatus, setServiceStatus] = useState<string>("Unknown");
  const [nextRunTime, setNextRunTime] = useState<string>("N/A");
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(
    Number(Cookies.get("refreshInterval")) || 60
  );
  const [nextRefreshTime, setNextRefreshTime] = useState<number>(Date.now() + refreshInterval * 1000);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchData();
      connectWebSocket();
    }
    return () => ws?.close();
  }, [config]);

  useEffect(() => {
    if (config) {
      const interval = setInterval(fetchData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, config]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
      setRefreshInterval(Number(Cookies.get("refreshInterval")) || data.defaultRefreshInterval);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const connectWebSocket = () => {
    if (!config) return;

    const socket = new WebSocket(config.webSocketUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setServiceStatus(data.status);
      setNextRunTime(new Date(data.nextRunTime).toLocaleString());
    };

    socket.onclose = () => {
      console.warn("WebSocket disconnected, retrying in 5 seconds...");
      setTimeout(connectWebSocket, 5000);
    };

    setWs(socket);
  };

  const fetchData = async () => {
    if (!config) return;

    setLoading(true);
    try {
      const [serverRes, clientsRes] = await Promise.all([
        axios.get<ServerInfo>(`${config.apiBaseUrl}/OpenVpnServer/GetServerInfo`),
        axios.get<ConnectedClient[]>(`${config.apiBaseUrl}/OpenVpnServer/GetAllConnectedClients`),
      ]);

      setServerInfo(serverRes.data);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
      scheduleNextRefresh();
    }
  };

  const scheduleNextRefresh = () => {
    setNextRefreshTime(Date.now() + refreshInterval * 1000);
  };

  const handleRunNow = async () => {
    if (!config) return;

    try {
      await axios.post(`${config.apiBaseUrl}/OpenVpnServer/run-now`);
      fetchData();
    } catch (error) {
      console.error("Error running service manually", error);
    }
  };

  const handleSaveInterval = () => {
    Cookies.set("refreshInterval", String(refreshInterval), { expires: 365 });
    scheduleNextRefresh();
  };

  return (
    <div>
      <h2>VPN Server:</h2>
      <ServerInfoComponent serverInfo={serverInfo} />

      <h2>VPN Clients:</h2>
      <ClientsTable clients={clients} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
        <label>
          Auto-refresh every (seconds):&nbsp;
          <input
            type="number"
            className="input-number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Math.max(5, Number(e.target.value)))}
            min="5"
          />
        </label>
        <button className="btn primary" onClick={handleSaveInterval}>
          <FaSave /> Set
        </button>
        <button className="btn secondary" onClick={fetchData} disabled={loading}>
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
      </div>

      <h2>VPN Client Locations:</h2>
      <VpnMap clients={clients} />

      <NextRefreshTimer nextRefreshTime={nextRefreshTime} onReset={scheduleNextRefresh} />

      <ServiceControls
        serviceStatus={serviceStatus}
        nextRunTime={nextRunTime}
        onRunNow={handleRunNow}
      />
    </div>
  );
}

export default Dashboard;
