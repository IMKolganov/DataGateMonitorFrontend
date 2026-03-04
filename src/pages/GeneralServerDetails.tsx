// src/pages/GeneralServerDetails.tsx
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams } from "react-router-dom";
import "../css/ServerDetails.css";
import { FaSync } from "react-icons/fa";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerDetailsInfoDefault from "../components/servers/ServerDetailsInfo.tsx";

import {
    useGetApiOpenVpnClientsGetAllConnected,
    useGetApiOpenVpnClientsGetAllHistory,
} from "../api/orval/open-vpn-server-clients/open-vpn-server-clients";

import type {
    GetApiOpenVpnClientsGetAllConnectedParams,
    GetApiOpenVpnClientsGetAllHistoryParams,
    ConnectedClientsResponse,
    VpnClientInfoDto,
    OpenVpnServerWithStatusDto,
    OpenVpnServerDto,
} from "../api/orval/model";

import {
    useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
    useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";
import { useGetApiOpenVpnConfigsGetVpnServerId } from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";
import { useGetApiOpenVpnServersConflogHistoryByServerVpnServerId } from "../api/orval/open-vpn-server-conflog/open-vpn-server-conflog";

type ConflogPayload = {
    application?: string | null;
    version?: string | null;
    config?: {
        vpnSubnet?: string | null;
        vpnNetmask?: string | null;
        port?: string | null;
        proto?: string | null;
    };
};

const ServerDetailsInfo = ServerDetailsInfoDefault as ComponentType<{
    serverInfo: unknown;
    toHumanReadableSize: (bytes: number) => string;
    loading?: boolean;
    configIp?: string | null;
    configPort?: number | null;
    latestConflogPayload?: ConflogPayload | null;
}>;

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

    const activeClientsResponse: ConnectedClientsResponse | undefined = isLive
        ? connectedQuery.data
        : historyQuery.data;

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

    const ovpnConfigQuery = useGetApiOpenVpnConfigsGetVpnServerId(numericServerId ?? 0, {
        query: {
            enabled: Number.isFinite(numericServerId),
            staleTime: 30000,
            retry: 1,
        },
    });

    const ovpnConfig = ovpnConfigQuery.data as { vpnServerIp?: string | null; vpnServerPort?: number | null } | undefined;
    const configIp = ovpnConfig?.vpnServerIp ?? null;
    const configPort = ovpnConfig?.vpnServerPort ?? null;

    const latestConflogQuery = useGetApiOpenVpnServersConflogHistoryByServerVpnServerId(
        numericServerId ?? 0,
        { page: 1, pageSize: 1 },
        { query: { enabled: Number.isFinite(numericServerId) } }
    );
    const latestConflogItems = (latestConflogQuery.data as { items?: { payload?: ConflogPayload }[] } | undefined)?.items ?? [];
    const latestConflogPayload: ConflogPayload | null = latestConflogItems[0]?.payload ?? null;

    const loadingServer = serverWithStatusQuery.isFetching || serverBasicQuery.isFetching;

    const serverWithStatus: OpenVpnServerWithStatusDto | undefined =
        serverWithStatusQuery.data?.openVpnServerWithStatus;

    const serverEntity: OpenVpnServerDto | undefined =
        serverWithStatus?.openVpnServerResponses?.openVpnServer ??
        serverBasicQuery.data?.openVpnServer;

    const serverLocation = useMemo<[number, number] | null>(() => {
        const lat = serverEntity?.latitude;
        const lon = serverEntity?.longitude;

        if (typeof lat === "number" && typeof lon === "number") return [lat, lon];
        return null;
    }, [serverEntity]);

    const serverName = serverEntity?.serverName ?? null;

    const serverInfo = useMemo(() => {
        if (serverWithStatusQuery.data?.openVpnServerWithStatus) {
            return serverWithStatusQuery.data.openVpnServerWithStatus;
        }

        if (serverBasicQuery.data) {
            return serverBasicQuery.data;
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
        latestConflogQuery.refetch();
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
                configIp={configIp}
                configPort={configPort}
                latestConflogPayload={latestConflogPayload}
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
            <VpnMap clients={clients} serverLocation={serverLocation} serverName={serverName} />
        </div>
    );
}

export default GeneralServerDetails;
