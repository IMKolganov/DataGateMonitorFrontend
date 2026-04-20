// src/pages/GeneralServerDetails.tsx
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams } from "react-router-dom";
import "../css/ServerDetails.css";
import "../css/Settings.css";
import { FaInfoCircle, FaMapMarkerAlt, FaSync, FaUsers } from "react-icons/fa";
import { isOpenVpnStack } from "../constants/vpnServerType";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerDetailsInfoDefault from "../components/servers/ServerDetailsInfo.tsx";

import {
    useGetApiOpenVpnClientsGetAllConnected,
    useGetApiOpenVpnClientsGetAllHistory,
} from "../api/orval/vpn-server-clients/vpn-server-clients";

import type {
    GetApiOpenVpnClientsGetAllConnectedParams,
    GetApiOpenVpnClientsGetAllHistoryParams,
    ConnectedClientsResponse,
    VpnClientInfoDto,
    VpnServerWithStatusDto,
    VpnServerDto,
    VpnServerWithStatusResponse,
    VpnServerResponse,
} from "../api/orval/model";

import {
    useGetApiOpenVpnServersGetServerWithStatusVpnServerId,
    useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/vpn-servers/vpn-servers";
import { useGetApiOpenVpnConfigsGetVpnServerId } from "../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config";
import { useGetApiOpenVpnServersConflogHistoryByServerVpnServerId } from "../api/orval/vpn-server-conflog/vpn-server-conflog";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import {
    useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
    getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
} from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { useQueryClient } from "@tanstack/react-query";
import type { QuotaPlansResponse, QuotaPlanAllowedServerDto } from "../api/orval/model";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";

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
    const [pageSize, setPageSize] = usePersistedPageSize(
        `clients:${vpnServerId ?? "0"}`,
        10,
        "5,10,20,50,100",
    );
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation result reference is unstable; `mutate` is stable (TanStack Query v5)
    }, [getPlansMutation.mutate]);

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

    const serverKindReady = serverWithStatusQuery.isSuccess || serverBasicQuery.isSuccess;
    const scopedStackType =
        (serverWithStatusQuery.data as unknown as VpnServerWithStatusResponse | undefined)
            ?.vpnServerWithStatus?.vpnServerResponses?.vpnServer?.serverType ??
        (serverBasicQuery.data as unknown as VpnServerResponse | undefined)?.vpnServer?.serverType;
    const openVpnQueriesEnabled =
        Number.isFinite(numericServerId) && serverKindReady && isOpenVpnStack(scopedStackType);

    const connectedQuery = useGetApiOpenVpnClientsGetAllConnected(connectedParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && isLive && openVpnQueriesEnabled,
            staleTime: 10000,
            retry: 1,
        },
    });

    const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && !isLive && openVpnQueriesEnabled,
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

    const ovpnConfigQuery = useGetApiOpenVpnConfigsGetVpnServerId(numericServerId ?? 0, {
        query: {
            enabled: Number.isFinite(numericServerId) && openVpnQueriesEnabled,
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
        { query: { enabled: Number.isFinite(numericServerId) && openVpnQueriesEnabled } }
    );
    const latestConflogItems = (latestConflogQuery.data as { items?: { payload?: ConflogPayload }[] } | undefined)?.items ?? [];
    const latestConflogPayload: ConflogPayload | null = latestConflogItems[0]?.payload ?? null;

    const loadingServer = serverWithStatusQuery.isFetching || serverBasicQuery.isFetching;

    const serverWithStatusPayload = serverWithStatusQuery.data as unknown as
        | VpnServerWithStatusResponse
        | undefined;
    const serverWithStatus: VpnServerWithStatusDto | undefined =
        serverWithStatusPayload?.vpnServerWithStatus;

    const serverBasicPayload = serverBasicQuery.data as unknown as VpnServerResponse | undefined;

    const serverEntity: VpnServerDto | undefined =
        serverWithStatus?.vpnServerResponses?.vpnServer ?? serverBasicPayload?.vpnServer;

    const serverLocation = useMemo<[number, number] | null>(() => {
        const lat = serverEntity?.latitude;
        const lon = serverEntity?.longitude;

        if (typeof lat === "number" && typeof lon === "number") return [lat, lon];
        return null;
    }, [serverEntity]);

    const serverName = serverEntity?.serverName ?? null;

    const serverInfo = useMemo(() => {
        const withStatus = serverWithStatusQuery.data as unknown as
            | VpnServerWithStatusResponse
            | undefined;
        if (withStatus?.vpnServerWithStatus) {
            return withStatus.vpnServerWithStatus;
        }

        const basic = serverBasicQuery.data as unknown as VpnServerResponse | undefined;
        if (basic) {
            return basic;
        }

        return null;
    }, [serverWithStatusQuery.data, serverBasicQuery.data]);

    useEffect(() => {
        setPage(0);
    }, [isLive]);

    const handleRefresh = () => {
        if (openVpnQueriesEnabled) {
            if (isLive) connectedQuery.refetch();
            else historyQuery.refetch();
            latestConflogQuery.refetch();
        }

        serverWithStatusQuery.refetch();
        serverBasicQuery.refetch();

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

                    {openVpnQueriesEnabled ? (
                        <label className="square-toggle">
                            <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">{isLive ? "Live" : "History"}</span>
                        </label>
                    ) : null}
                </div>
            </div>

            <ServerDetailsInfo
                serverInfo={serverInfo}
                toHumanReadableSize={toHumanReadableSize}
                loading={loadingServer}
                configIp={openVpnQueriesEnabled ? configIp : null}
                configPort={openVpnQueriesEnabled ? configPort : null}
                latestConflogPayload={openVpnQueriesEnabled ? latestConflogPayload : null}
                quotaPlanLabels={quotaPlanLabels}
            />

            {openVpnQueriesEnabled ? (
                <>
                    <section className="server-details__panel" aria-labelledby="server-vpn-clients-heading">
                        <h3 id="server-vpn-clients-heading" className="settings-card__h3-with-icon">
                            <FaUsers className="icon" aria-hidden />
                            <span>
                                VPN Clients ({isLive ? "Connected" : "Historical"})
                                {loadingClients && (
                                    <span style={{ fontSize: 12, opacity: 0.7 }}> loading…</span>
                                )}
                            </span>
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
                    </section>

                    <section className="server-details__panel" aria-labelledby="server-vpn-locations-heading">
                        <h3 id="server-vpn-locations-heading" className="settings-card__h3-with-icon">
                            <FaMapMarkerAlt className="icon" aria-hidden />
                            <span>VPN Client Locations</span>
                        </h3>
                        <VpnMap clients={clients} serverLocation={serverLocation} serverName={serverName} />
                    </section>
                </>
            ) : serverKindReady ? (
                <section className="server-details__panel" aria-labelledby="server-xray-stack-heading">
                    <h3 id="server-xray-stack-heading" className="settings-card__h3-with-icon">
                        <FaInfoCircle className="icon" aria-hidden />
                        <span>Xray (VLESS)</span>
                    </h3>
                    <p style={{ lineHeight: 1.55, maxWidth: "52rem" }}>
                        OpenVPN client lists, .ovpn configuration, and conflog-derived fields do not apply to this
                        server. Use your Xray control path and the node API URL below for operations.
                    </p>
                    {serverEntity?.apiUrl ? (
                        <p style={{ marginTop: 8 }}>
                            <span className="detail-label">Node API URL: </span>
                            <code>{serverEntity.apiUrl}</code>
                        </p>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}

export default GeneralServerDetails;
