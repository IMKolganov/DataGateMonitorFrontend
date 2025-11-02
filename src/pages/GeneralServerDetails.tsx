// src/pages/GeneralServerDetails.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../css/ServerDetails.css";
import { FaSync } from "react-icons/fa";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerDetailsInfo from "../components/ServerDetailsInfo";

import {
  useGetApiOpenVpnClientsGetAllConnected,
  useGetApiOpenVpnClientsGetAllHistory,
} from "../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import type {
  GetApiOpenVpnClientsGetAllConnectedParams,
  GetApiOpenVpnClientsGetAllHistoryParams,
} from "../api/orval/model";

type ConnectedClientsResponse = {
  clients: any[];
  totalCount: number;
};

export function GeneralServerDetails() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  const [isLive, setIsLive] = useState(true);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loadingServer, setLoadingServer] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const numericServerId = useMemo(
    () => (vpnServerId ? Number(vpnServerId) : undefined),
    [vpnServerId]
  );

  const connectedParams = useMemo(
    () =>
      ({
        vpnServerId: numericServerId,
        pageNumber: page + 1,
        pageSize,
      }) as GetApiOpenVpnClientsGetAllConnectedParams,
    [numericServerId, page, pageSize]
  );

  const historyParams = connectedParams as GetApiOpenVpnClientsGetAllHistoryParams;

  // Queries for clients (already unwrapped by ogmMutator)
  const connectedQuery = useGetApiOpenVpnClientsGetAllConnected(connectedParams, {
    query: {
      enabled: !!numericServerId && isLive,
      keepPreviousData: true,
      staleTime: 10_000,
    },
  });

  const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
    query: {
      enabled: !!numericServerId && !isLive,
      keepPreviousData: true,
      staleTime: 10_000,
    },
  });

  const loadingClients =
    (isLive ? connectedQuery.isFetching : historyQuery.isFetching) ?? false;

  const clientsPayload: ConnectedClientsResponse =
    (isLive ? connectedQuery.data : historyQuery.data) ??
    ({ clients: [], totalCount: 0 } as ConnectedClientsResponse);

  const clients = Array.isArray(clientsPayload.clients) ? clientsPayload.clients : [];
  const totalClients =
    typeof clientsPayload.totalCount === "number" ? clientsPayload.totalCount : 0;

  // Optional: load server info (stub)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!numericServerId) return;
      setLoadingServer(true);
      try {
        // TODO: replace with servers orval hook when available
        if (!cancelled) setServerInfo(null);
      } finally {
        if (!cancelled) setLoadingServer(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [numericServerId]);

  const toHumanReadableSize = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < sizes.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(2)} ${sizes[i]}`;
  };

  const handleRefresh = () => {
    if (isLive) connectedQuery.refetch();
    else historyQuery.refetch();
  };

  useEffect(() => {
    setPage(0);
  }, [isLive]);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div className="header-bar">
        <div className="left-buttons">
          <button
            className="btn secondary"
            onClick={handleRefresh}
            disabled={loadingServer || loadingClients}
          >
            <FaSync className={`icon ${loadingServer || loadingClients ? "icon-spin" : ""}`} />{" "}
            Refresh
          </button>
          <label className="square-toggle">
            <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
            <span className="toggle-slider"></span>
            <span className="toggle-text">{isLive ? "Live" : "History"}</span>
          </label>
        </div>
        <div className="right-buttons">{/* reserved for future actions */}</div>
      </div>

      {loadingServer ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading server details...</p>
        </div>
      ) : serverInfo ? (
        <ServerDetailsInfo serverInfo={serverInfo} toHumanReadableSize={toHumanReadableSize} />
      ) : (
        <div style={{ marginBottom: 12, opacity: 0.8, fontSize: 14 }}>
          Server info is not available yet.
        </div>
      )}

      <h3>
        VPN Clients ({isLive ? "Connected" : "Historical"}){" "}
        {loadingClients && <span style={{ fontSize: 12, opacity: 0.7 }}>loading…</span>}
      </h3>

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
