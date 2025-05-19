import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/ServerDetails.css";

import {
  FaSync,
  FaCog
} from "react-icons/fa";

import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerDetailsInfo from "../components/ServerDetailsInfo";
import {
  fetchServersWithStats,
  fetchConnectedClients,
  fetchHistoryClients
} from "../utils/api";

export function GeneralServerDetails() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(true);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (id) {
      fetchServerData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchClientsData();
    }
  }, [id, isLive, page, pageSize]);

  const fetchServerData = async () => {
    if (!id) return;
    setLoadingServer(true);
    fetchClientsData();

    try {
      const serverRes = await fetchServersWithStats(id);
      setServerInfo(serverRes || {});
    } catch (error) {
      console.error("Error fetching server details:", error);
    } finally {
      setLoadingServer(false);
    }
  };

  const fetchClientsData = async () => {
    if (!id) return;
    setLoadingClients(true);

    try {
      const clientsRes = isLive
        ? await fetchConnectedClients(id, page + 1, pageSize)
        : await fetchHistoryClients(id, page + 1, pageSize);

      setClients(clientsRes?.clients || []);
      setTotalClients(clientsRes?.totalCount || 0);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
      setTotalClients(0);
    } finally {
      setLoadingClients(false);
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
    <div style={{ width: "100%", minWidth: 0 }}>
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={fetchServerData} disabled={loadingServer}>
            {FaSync({ className: `icon ${loadingServer ? "icon-spin" : ""}` })} Refresh
          </button>
          <label className="square-toggle">
            <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
            <span className="toggle-slider"></span>
            <span className="toggle-text">{isLive ? "Live" : "History"}</span>
          </label>
        </div>
        <div className="right-buttons">
          {/* <button
            className="btn secondary settings-button"
            onClick={() => navigate(`/server-details/${id}/settings`)}
          >
            {FaCog({ className: "icon" })} Settings
          </button> */}
        </div>
      </div>

      {loadingServer ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading server details...</p>
        </div>
      ) : (
        <ServerDetailsInfo serverInfo={serverInfo} toHumanReadableSize={toHumanReadableSize} />
      )}

      <h3>VPN Clients ({isLive ? "Connected" : "Historical"})</h3>

      <div style={{ width: "100%", minWidth: 0 }}>
        <ClientsTable
          clients={clients}
          totalClients={totalClients}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={loadingClients}
        />
      </div>

      <h3>VPN Client Locations</h3>
      <VpnMap clients={clients} />
    </div>
  );
}

export default GeneralServerDetails;
