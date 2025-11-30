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
    ConnectedClientsResponseApiResponse,
    VpnClientInfoDto,
} from "../api/orval/model";

import {
    useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
    useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

const ServerDetailsInfo = ServerDetailsInfoDefault as ComponentType<{
    serverInfo: unknown;
    toHumanReadableSize: (bytes: number) => string;
    loading?: boolean;
}>;

interface FlatServer {
    serverName: string;
    isOnline?: boolean;
    isDefault?: boolean;
    apiUrl?: string | null;
}

interface ServerWithStatusPayload {
    openVpnServerWithStatus: {
        openVpnServerResponses?: { openVpnServer?: FlatServer };
        openVpnServer?: FlatServer;
        server?: FlatServer;
        openVpnServerStatusLogResponse?: unknown;
        totalBytesIn?: number;
        totalBytesOut?: number;
        countConnectedClients?: number;
        countSessions?: number;
    };
}

interface BasicServerPayload {
    openVpnServer: FlatServer;
}

type ConnectedClientsUnion =
    | ConnectedClientsResponse
    | ConnectedClientsResponseApiResponse
    | undefined;

function unwrapConnectedClientsResponse(
    input: ConnectedClientsUnion
): ConnectedClientsResponse | undefined {
    if (!input) return undefined;

    if ("totalCount" in input || "vpnClients" in input) {
        return input as ConnectedClientsResponse;
    }

    const api = input as ConnectedClientsResponseApiResponse;
    return api.data;
}

export function GeneralServerDetails() {
    const { vpnServerId } = useParams<{ vpnServerId?: string }>();

    const [isLive, setIsLive] = useState(true);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalClients, setTotalClients] = useState(0);

    const numericServerId = useMemo(
        () => (vpnServerId ? Number(vpnServerId) : undefined),
        [vpnServerId]
    );

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
            staleTime: 10000,
            retry: 1,
        },
    });

    const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && !isLive,
            staleTime: 10000,
            retry: 1,
        },
    });

    const loadingClients =
        (isLive ? connectedQuery.isFetching : historyQuery.isFetching) ?? false;

    const rawConnected = connectedQuery.data as ConnectedClientsUnion;
    const rawHistory = historyQuery.data as ConnectedClientsUnion;

    const activeClientsResponse: ConnectedClientsResponse | undefined = isLive
        ? unwrapConnectedClientsResponse(rawConnected)
        : unwrapConnectedClientsResponse(rawHistory);

    const clients: VpnClientInfoDto[] = activeClientsResponse?.vpnClients ?? [];

    useEffect(() => {
        const newTotal = activeClientsResponse?.totalCount;
        if (typeof newTotal === "number" && newTotal >= 0) {
            setTotalClients(newTotal);
        }
    }, [activeClientsResponse?.totalCount]);

    const serverWithStatusQuery = useGetApiOpenVpnServersGetServerWithStatusVpnServerId(
        numericServerId ?? 0,
        {
            query: {
                enabled: Number.isFinite(numericServerId),
                staleTime: 30000,
                retry: 1,
            },
        }
    );

    const serverBasicQuery = useGetApiOpenVpnServersGetVpnServerId(numericServerId ?? 0, {
        query: {
            enabled: Number.isFinite(numericServerId) && !serverWithStatusQuery.data,
            staleTime: 30000,
            retry: 1,
        },
    });

    const loadingServer = serverWithStatusQuery.isFetching || serverBasicQuery.isFetching;

    const serverInfo = useMemo(() => {
        const wsData = serverWithStatusQuery.data as unknown;

        if (
            wsData &&
            typeof wsData === "object" &&
            "openVpnServerWithStatus" in wsData
        ) {
            const wsTyped = wsData as ServerWithStatusPayload;
            const w = wsTyped.openVpnServerWithStatus;

            const ov: FlatServer | null =
                w.openVpnServerResponses?.openVpnServer ??
                w.openVpnServer ??
                w.server ??
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
                openVpnServerStatusLogResponse: w.openVpnServerStatusLogResponse ?? null,
                totalBytesIn: w.totalBytesIn ?? 0,
                totalBytesOut: w.totalBytesOut ?? 0,
                countConnectedClients: w.countConnectedClients ?? 0,
                countSessions: w.countSessions ?? 0,
            };
        }

        const basicData = serverBasicQuery.data as unknown;
        if (
            basicData &&
            typeof basicData === "object" &&
            "openVpnServer" in basicData
        ) {
            const basicTyped = basicData as BasicServerPayload;
            const ov = basicTyped.openVpnServer;

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

    useEffect(() => {
        setPage(0);
    }, [isLive]);

    const handleRefresh = () => {
        if (isLive) connectedQuery.refetch();
        else historyQuery.refetch();
        serverWithStatusQuery.refetch();
        serverBasicQuery.refetch();
    };

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
                        <FaSync className={`icon ${loadingServer || loadingClients ? "icon-spin" : ""}`} />
                        Refresh
                    </button>

                    <label className="square-toggle">
                        <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">{isLive ? "Live" : "History"}</span>
                    </label>
                </div>
            </div>

            <ServerDetailsInfo
                serverInfo={serverInfo}
                toHumanReadableSize={toHumanReadableSize}
                loading={loadingServer}
            />

            <h3>
                VPN Clients ({isLive ? "Connected" : "Historical"})
                {loadingClients && <span style={{ fontSize: 12, opacity: 0.7 }}> loading…</span>}
            </h3>

            <ClientsTable
                clients={clients}
                totalClients={totalClients}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                loading={loadingClients}
            />

            <h3>VPN Client Locations</h3>
            <VpnMap clients={clients} />
        </div>
    );
}

export default GeneralServerDetails;
