// src/pages/GeneralServerDetails.tsx
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams } from "react-router-dom";
import "../css/ServerDetails.css";
import { FaSync } from "react-icons/fa";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerDetailsInfoDefault from "../components/ServerDetailsInfo";

import {
  useGetApiOpenVpnClientsGetAllConnected,
  useGetApiOpenVpnClientsGetAllHistory,
} from "../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import type {
  GetApiOpenVpnClientsGetAllConnectedParams,
  GetApiOpenVpnClientsGetAllHistoryParams,
  ConnectedClientsResponse,
  VpnClientInfoResponse,
} from "../api/orval/model";

import {
  useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
  useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

// explicit type to avoid IntrinsicAttributes error
const ServerDetailsInfo = ServerDetailsInfoDefault as ComponentType<{
  serverInfo: any;
  toHumanReadableSize: (bytes: number) => string;
}>;

export function GeneralServerDetails() {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();

  const [isLive, setIsLive] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const numericServerId = useMemo(
    () => (vpnServerId ? Number(vpnServerId) : undefined),
    [vpnServerId]
  );

  // -------- Clients (connected/history) --------
  const connectedParams: GetApiOpenVpnClientsGetAllConnectedParams = useMemo(
    () => ({
      VpnServerId: numericServerId ?? 0,
      Page: page + 1,
      PageSize: pageSize,
    }),
    [numericServerId, page, pageSize]
  );

  const historyParams: GetApiOpenVpnClientsGetAllHistoryParams = useMemo(
    () => ({
      VpnServerId: numericServerId ?? 0,
      Page: page + 1,
      PageSize: pageSize,
    }),
    [numericServerId, page, pageSize]
  );

  const connectedQuery = useGetApiOpenVpnClientsGetAllConnected(connectedParams, {
    query: {
      enabled: Number.isFinite(numericServerId) && isLive,
      staleTime: 10_000,
      retry: 1,
    },
  });

  const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
    query: {
      enabled: Number.isFinite(numericServerId) && !isLive,
      staleTime: 10_000,
      retry: 1,
    },
  });

  const loadingClients =
    (isLive ? connectedQuery.isFetching : historyQuery.isFetching) ?? false;

  const activeClientsResponse: ConnectedClientsResponse | undefined = isLive
    ? (connectedQuery.data?.data as ConnectedClientsResponse | undefined)
    : (historyQuery.data?.data as ConnectedClientsResponse | undefined);

  const clients: VpnClientInfoResponse[] =
    (activeClientsResponse?.clients ?? []) as VpnClientInfoResponse[];
  const totalClients = activeClientsResponse?.totalCount ?? 0;

  // -------- Server info (with-status preferred, fallback to basic get) --------
  const serverWithStatusQuery = useGetApiOpenVpnServersGetServerWithStatusVpnServerId(
    numericServerId ?? 0,
    {
      query: {
        enabled: Number.isFinite(numericServerId),
        staleTime: 30_000,
        retry: 1,
      },
    }
  );

  const serverBasicQuery = useGetApiOpenVpnServersGetVpnServerId(numericServerId ?? 0, {
    query: {
      enabled: Number.isFinite(numericServerId) && !serverWithStatusQuery.data,
      staleTime: 30_000,
      retry: 1,
    },
  });

  const loadingServer = serverWithStatusQuery.isFetching || serverBasicQuery.isFetching;

  // normalize shape for ServerDetailsInfo
  const serverInfo = useMemo(() => {
    const ws: any = serverWithStatusQuery.data;
    if (ws?.openVpnServerWithStatus) {
      const w = ws.openVpnServerWithStatus;

      const ov =
        w?.openVpnServerResponses?.openVpnServer ??
        w?.openVpnServer ??
        w?.server ??
        null;

      const flatServer = ov
        ? {
            serverName: ov.serverName,
            isOnline: !!ov.isOnline,
            isDefault: !!ov.isDefault,
            apiUrl: ov.apiUrl ?? "",
          }
        : null;

      return {
        openVpnServerResponses: flatServer,
        openVpnServerStatusLogResponse: w?.openVpnServerStatusLogResponse ?? null,
        totalBytesIn: w?.totalBytesIn ?? 0,
        totalBytesOut: w?.totalBytesOut ?? 0,
        countConnectedClients: w?.countConnectedClients ?? 0,
        countSessions: w?.countSessions ?? 0,
      };
    }

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

  const handleRefresh = () => {
    if (isLive) connectedQuery.refetch();
    else historyQuery.refetch();

    serverWithStatusQuery.refetch();
    serverBasicQuery.refetch();
  };

  useEffect(() => {
    setPage(0);
  }, [isLive]);

  const toHumanReadableSize = (bytes: number = 0): string => {
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
        <div className="right-buttons">{/* reserved */}</div>
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
