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

// server orval hooks
import {
  useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
  useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

type ConnectedClientsResponse = {
  clients: any[];
  totalCount: number;
};

export function GeneralServerDetails() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  const [isLive, setIsLive] = useState(true);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // parse numeric id
  const numericServerId = useMemo(
    () => (vpnServerId ? Number(vpnServerId) : undefined),
    [vpnServerId]
  );

  // -------- Clients (connected/history) --------
  const connectedParams = useMemo(
    () =>
      ({
        vpnServerId: numericServerId,
        pageNumber: page + 1, // API is usually 1-based
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
      retry: 1,
      onSuccess: (d) => console.debug("[clients connected] success:", d),
      onError: (e) => console.debug("[clients connected] error:", e),
    },
  });

  const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
    query: {
      enabled: !!numericServerId && !isLive,
      keepPreviousData: true,
      staleTime: 10_000,
      retry: 1,
      onSuccess: (d) => console.debug("[clients history] success:", d),
      onError: (e) => console.debug("[clients history] error:", e),
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

  // -------- Server info (with-status preferred, fallback to basic get) --------
  const serverWithStatusQuery = useGetApiOpenVpnServersGetServerWithStatusVpnServerId(
    numericServerId ?? 0,
    {
      query: {
        enabled: Number.isFinite(numericServerId),
        staleTime: 30_000,
        retry: 1,
        onSuccess: (d) => console.debug("[server with-status] success:", d),
        onError: (e) => console.debug("[server with-status] error:", e),
      },
    }
  );

  const serverBasicQuery = useGetApiOpenVpnServersGetVpnServerId(numericServerId ?? 0, {
    query: {
      enabled: Number.isFinite(numericServerId) && !serverWithStatusQuery.data,
      staleTime: 30_000,
      retry: 1,
      onSuccess: (d) => console.debug("[server basic] success:", d),
      onError: (e) => console.debug("[server basic] error:", e),
    },
  });

  const loadingServer = serverWithStatusQuery.isFetching || serverBasicQuery.isFetching;

  // Normalize to shape expected by <ServerDetailsInfo />
  const serverInfo = useMemo(() => {
    // A) Already combined payload from with-status
    const s: any = serverWithStatusQuery.data;
    if (s && (s.openVpnServerResponses || s.openVpnServerStatusLogResponse)) {
      return s;
    }

    // B) Basic get/{id} -> wrap into expected fields
    const b: any = serverBasicQuery.data;
    if (b?.openVpnServer) {
      const ov = b.openVpnServer;
      return {
        openVpnServerResponses: {
          serverName: ov.serverName,
          isOnline: !!ov.isOnline,
          isDefault: !!ov.isDefault,
          apiUrl: ov.apiUrl ?? "",
        },
        openVpnServerStatusLogResponse: {
          upSince: null,
          version: null,
          serverLocalIp: null,
          serverRemoteIp: null,
          bytesIn: 0,
          bytesOut: 0,
          sessionId: null,
        },
        totalBytesIn: 0,
        totalBytesOut: 0,
        countConnectedClients: 0,
        countSessions: 0,
      };
    }

    return null;
  }, [serverWithStatusQuery.data, serverBasicQuery.data]);

  // logging for visibility
  useEffect(() => {
    console.debug("[GeneralServerDetails] numericServerId =", numericServerId);
  }, [numericServerId]);

  // Manual refresh (refetch what is currently active)
  const handleRefresh = () => {
    if (isLive) connectedQuery.refetch();
    else historyQuery.refetch();

    // refresh server
    serverWithStatusQuery.refetch();
    serverBasicQuery.refetch();
  };

  // Reset page when toggling live/history
  useEffect(() => {
    setPage(0);
  }, [isLive]);

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
          {/* add some debug to see why it's empty */}
          Server info is not available yet.
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.8 }}>
            {JSON.stringify(
              {
                withStatusEnabled: Number.isFinite(numericServerId),
                withStatusHasData: !!serverWithStatusQuery.data,
                basicEnabled: Number.isFinite(numericServerId) && !serverWithStatusQuery.data,
                basicHasData: !!serverBasicQuery.data,
              },
              null,
              2
            )}
          </pre>
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
