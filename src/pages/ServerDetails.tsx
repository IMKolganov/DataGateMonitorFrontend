import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/ServerDetails.css";

import { FaSync, FaArrowLeft, FaKey, FaTerminal, FaCog } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";

import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import { fetchServersWithStats, fetchConnectedClients, fetchHistoryClients } from "../utils/api";

export function ServerDetails() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState<boolean>(true);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [totalClients, setTotalClients] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, isLive, page, pageSize]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const serverRes = await fetchServersWithStats(id);
      setServerInfo(serverRes || {});

      const clientsRes = isLive
        ? await fetchConnectedClients(id, page + 1, pageSize)
        : await fetchHistoryClients(id, page + 1, pageSize);

      setClients(clientsRes.openVpnServerClients || []);
      setTotalClients(clientsRes.totalCount || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toHumanReadableSize = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="content-wrapper wide-table">
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={() => navigate("/")}>
            <FaArrowLeft className="icon" /> Back
          </button>
          <button className="btn secondary" onClick={fetchData} disabled={loading}>
            <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
          </button>
          <button className="btn secondary" onClick={() => navigate(`/server-details/${id}/certificates`)}>
            <FaKey className="icon" /> Manage Certificates
          </button>
          <button className="btn secondary" onClick={() => navigate(`/server-details/${id}/console`)}>
            <FaTerminal className="icon" /> OpenVPN Console
          </button>
          <label className="square-toggle">
            <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
            <span className="toggle-slider"></span>
            <span className="toggle-text">{isLive ? "Live" : "History"}</span>
          </label>
        </div>
        <div className="right-buttons">
          <button className="btn secondary settings-button" onClick={() => navigate(`/server-details/${id}/settings`)}>
            <FaCog className="icon" /> Settings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading server details...</p>
        </div>
      ) : id ? (
        <>
          {serverInfo && serverInfo.openVpnServer ? (
            <div className="server-info">
              <div className="server-header">
                <div className="server-info">
                  <strong className="server-name">{serverInfo.openVpnServer.serverName}</strong>
                </div>
                <div className={`server-status ${serverInfo.openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
                  {serverInfo.openVpnServer.isOnline ? "Online" : "Offline"}
                </div>
              </div>

              {serverInfo.openVpnServerStatusLog && (
                <div className="server-details">
                  <div className="detail-row">
                    <BsClock className="detail-icon" />
                    <span className="detail-label">Uptime:</span>
                    <span>{serverInfo.openVpnServerStatusLog?.upSince ? new Date(serverInfo.openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <RiHardDrive2Line className="detail-icon" />
                    <span className="detail-label">Version:</span>
                    <span>{serverInfo.openVpnServerStatusLog?.version || "Unknown"}</span>
                  </div>
                  <div className="detail-row">
                    <BsHddNetwork className="detail-icon" />
                    <span className="detail-label">Local IP:</span>
                    <span>{serverInfo.openVpnServerStatusLog?.serverLocalIp || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <BsHddNetwork className="detail-icon" />
                    <span className="detail-label">Remote IP:</span>
                    <span>{serverInfo.openVpnServerStatusLog?.serverRemoteIp || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <IoIosSpeedometer className="detail-icon" />
                    <span className="detail-label">Traffic IN:</span>
                    <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog?.bytesIn || 0)}</span>
                  </div>
                  <div className="detail-row">
                    <IoIosSpeedometer className="detail-icon" />
                    <span className="detail-label">Traffic OUT:</span>
                    <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog?.bytesOut || 0)}</span>
                  </div>
                  <div className="detail-row">
                    <BsHddNetwork className="detail-icon" />
                    <span className="detail-label">Session Id:</span>
                    <span>{serverInfo.openVpnServerStatusLog?.sessionId || "N/A"}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No server information available.</p>
          )}

          <h3>VPN Clients ({isLive ? "Connected" : "Historical"})</h3>
          <ClientsTable
            clients={clients}
            totalClients={totalClients}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />

          <h3>VPN Client Locations</h3>
          <VpnMap clients={clients} />
        </>
      ) : (
        <p style={{ textAlign: "center", marginTop: "20px", color: "red" }}>Invalid Server ID</p>
      )}
    </div>
  );
}

export default ServerDetails;
