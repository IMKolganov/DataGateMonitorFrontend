import React, { useState, useEffect } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { fetchServers, deleteServer } from "../utils/api";
import { OpenVpnServerInfoResponse, ServiceStatus } from "../utils/types";
import ServerItem from "./ServerItem";
import ServiceControls from "./ServiceControls";
import useWebSocketService from "../hooks/useWebSocketService";
import "../css/ServerList.css";

interface ServerWithStatus extends OpenVpnServerInfoResponse {
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
}

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const { serviceData, runServiceNow } = useWebSocketService();

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (Object.keys(serviceData).length > 0) {
      setServers((prevServers) =>
        prevServers.map((server) => {
          const serverId = server.openVpnServer.id.toString();
          const serviceInfo = serviceData[serverId];

          return serviceInfo
            ? {
                ...server,
                serviceStatus: serviceInfo.status,
                errorMessage: serviceInfo.errorMessage,
                nextRunTime: serviceInfo.nextRunTime,
              }
            : server;
        })
      );
    }
  }, [serviceData]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const data = await fetchServers();
      setServers(
        data.map((server) => ({
          ...server,
          serviceStatus: ServiceStatus.Idle, // По умолчанию
          errorMessage: null,
          nextRunTime: "N/A",
        }))
      );
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;
    try {
      await deleteServer(id);
      setServers((prev) => prev.filter((server) => server.openVpnServer.id !== id));
    } catch (error) {
      console.error("Error deleting server:", error);
    }
  };

  return (
    <div>
      <div className="header-container">
        <div className="action-buttons">
          <button className="btn primary" onClick={() => navigate("/servers/add")}>
            <FaPlus className="icon" /> Add Server
          </button>
          <button className="btn secondary" onClick={loadServers} disabled={loading}>
            <FaSyncAlt className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading servers...</p>
        </div>
      ) : (
        <ul className="list">
          {servers.length > 0 ? (
            servers.map((server) => (
              <ServerItem
                key={server.openVpnServer.id}
                server={server}
                serviceStatus={server.serviceStatus}
                errorMessage={server.errorMessage}
                nextRunTime={server.nextRunTime}
                onView={(id) => navigate(`/server-details/${id}`)}
                onEdit={(id) => navigate(`/servers/edit/${id}`)}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <p>No servers available.</p>
          )}
        </ul>
      )}

      <ServiceControls serviceData={serviceData} onRunNow={runServiceNow} />
    </div>
  );
};

export default ServerList;
