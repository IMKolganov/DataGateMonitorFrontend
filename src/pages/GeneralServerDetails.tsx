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
    OpenVpnServerWithStatusResponse,
    OpenVpnServerResponse,
} from "../api/orval/model";

import {
    useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
    useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";
import { useGetApiOpenVpnConfigsGetVpnServerId } from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";
import { useGetApiOpenVpnServersConflogHistoryByServerVpnServerId } from "../api/orval/open-vpn-server-conflog/open-vpn-server-conflog";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import {
    useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
    getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
} from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { useQueryClient } from "@tanstack/react-query";
import type { QuotaPlansResponse, QuotaPlanAllowedServerDto } from "../api/orval/model";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";

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
    quotaPlanLabels?: string[] | null;
}>;

function getAllowedItemsByVpnServer(raw: unknown): QuotaPlanAllowedServerDto[] {
    if (raw == null) return [];
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as QuotaPlanAllowedServerDto[];
    const data = r.data as Record<string, unknown> | undefined;
    if (data && Array.isArray(data.items)) return data.items as QuotaPlanAllowedServerDto[];
    const unwrapped = unwrapMaybeApiResponse<{ items?: QuotaPlanAllowedServerDto[] | null }>(raw as never);
    return unwrapped?.items ?? [];
}

export function GeneralServerDetails() {
    const { vpnServerId } = useParams<{ vpnServerId?: string }>();
    const queryClient = useQueryClient();

    const [isLive, setIsLive] = useState(true);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalClients, setTotalClients] = useState(0);
    const [planNameById, setPlanNameById] = useState<Map<number, string>>(new Map());

    const numericServerId = useMemo(
        () => (vpnServerId ? Number(vpnServerId) : undefined),
        [vpnServerId]
    );

    const getPlansMutation = usePostApiQuotaPlansGetAll();

    useEffect(() => {
        getPlansMutation.mutate(
            { data: { includeInactive: true } },
            {
                onSuccess: (raw) => {
                    const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(raw as never);
                    const m = new Map<number, string>();
                    for (const p of payload?.quotaPlans ?? []) {
                        if (p.id == null) continue;
                        const label =
                            (p.name?.trim() || `Plan #${p.id}`) +
                            (p.isActive === false ? " (inactive)" : "");
                        m.set(p.id, label);
                    }
                    setPlanNameById(m);
                },
            }
        );
    }, []);

    const { data: allowedByVpnRaw } = useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId(
        numericServerId ?? 0,
        {
            query: {
                enabled: Number.isFinite(numericServerId) && (numericServerId ?? 0) > 0,
            },
        }
    );

    const quotaPlanLabels = useMemo(() => {
        if (!Number.isFinite(numericServerId)) return [];
        const items = getAllowedItemsByVpnServer(allowedByVpnRaw);
        const labels: string[] = [];
        for (const item of items) {
            const qid = item.quotaPlanId;
            if (qid == null) continue;
            labels.push(planNameById.get(qid) ?? `Plan #${qid}`);
        }
        return labels;
    }, [numericServerId, allowedByVpnRaw, planNameById]);

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

    const activeClientsResponse =
        (isLive ? connectedQuery.data : historyQuery.data) as unknown as
            | ConnectedClientsResponse
            | undefined;

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

    const serverWithStatusPayload = serverWithStatusQuery.data as unknown as
        | OpenVpnServerWithStatusResponse
        | undefined;
    const serverWithStatus: OpenVpnServerWithStatusDto | undefined =
        serverWithStatusPayload?.openVpnServerWithStatus;

    const serverBasicPayload = serverBasicQuery.data as unknown as OpenVpnServerResponse | undefined;

    const serverEntity: OpenVpnServerDto | undefined =
        serverWithStatus?.openVpnServerResponses?.openVpnServer ?? serverBasicPayload?.openVpnServer;

    const serverLocation = useMemo<[number, number] | null>(() => {
        const lat = serverEntity?.latitude;
        const lon = serverEntity?.longitude;

        if (typeof lat === "number" && typeof lon === "number") return [lat, lon];
        return null;
    }, [serverEntity]);

    const serverName = serverEntity?.serverName ?? null;

    const serverInfo = useMemo(() => {
        const withStatus = serverWithStatusQuery.data as unknown as
            | OpenVpnServerWithStatusResponse
            | undefined;
        if (withStatus?.openVpnServerWithStatus) {
            return withStatus.openVpnServerWithStatus;
        }

        const basic = serverBasicQuery.data as unknown as OpenVpnServerResponse | undefined;
        if (basic) {
            return basic;
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

        if (Number.isFinite(numericServerId)) {
            queryClient.invalidateQueries({
                queryKey: getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey(
                    numericServerId!
                ),
            });
        }
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
                quotaPlanLabels={quotaPlanLabels}
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
