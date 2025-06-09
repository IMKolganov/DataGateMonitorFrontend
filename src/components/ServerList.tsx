import React, { useState, useEffect } from "react";
import { FaSyncAlt, FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchServers, deleteServer } from "../utils/api";
import { ServiceStatus } from "../utils/types";
import type { OpenVpnServerData } from "../utils/types";
import ServerItem from "./ServerItem";
import ServiceControls from "./ServiceControls";
import useWebSocketService from "../hooks/useWebSocketService";
import { useMediaQuery } from "react-responsive";
import "../css/ServerList.css";

interface ServerWithStatus extends OpenVpnServerData {
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
}

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const { serviceData, runServiceNow } = useWebSocketService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? parseInt(match[1]) : null;

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (Object.keys(serviceData).length > 0) {
      const normalizedServiceData: Record<number, typeof serviceData[string]> = {};
      for (const [key, value] of Object.entries(serviceData)) {
        normalizedServiceData[parseInt(key)] = value;
      }

      setServers((prevServers) =>
        prevServers.map((server) => {
          const id = server.openVpnServerResponses.id;
          const serviceInfo = normalizedServiceData[id];

          return serviceInfo
            ? {
                ...server,
                vpnServerId: serviceInfo.vpnServerId,
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
          vpnServerId: 0,
          serviceStatus: ServiceStatus.Idle,
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
      setServers((prev) => prev.filter((server) => server.openVpnServerResponses.id !== id));
    } catch (error) {
      console.error("Error deleting server:", error);
    }
  };

  return (
    <div>
      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn primary" onClick={() => navigate("/servers/add")}>
              <span className="icon">{FaPlus({ className: "icon" })}</span> Add Server
            </button>

            <button className="btn secondary" onClick={loadServers} disabled={loading}>
              <span className={`icon ${loading ? "icon-spin" : ""}`}>
                {FaSyncAlt({ className: `icon ${loading ? "icon-spin" : ""}` })}
              </span>
              Refresh
            </button>
          </div>
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
            servers.map((server) => {
              const id = server.openVpnServerResponses.id;
              return (
                <li
                  key={id}
                  className={`server-item clickable ${selectedServerId === id ? "selected" : ""}`}
                  onClick={() => navigate(`/servers/${id}`)}
                >
                  <ServerItem
                    server={server}
                    vpnServerId={server.vpnServerId}
                    serviceStatus={server.serviceStatus}
                    errorMessage={server.errorMessage}
                    nextRunTime={server.nextRunTime}
                    onView={(id) => {
                      if (isMobile) {
                        navigate(`/servers/${id}`);
                      } else {
                        navigate(`/servers/${id}`, { replace: true });
                      }
                    }}
                    onEdit={(id) => navigate(`/servers/edit/${id}`)}
                    onDelete={handleDelete}
                  />
                </li>
              );
            })
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
