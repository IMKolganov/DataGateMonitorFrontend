// src/pages/GeneralServerDetails.tsx
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams } from "react-router-dom";
import "../css/ServerDetails.css";
import "../css/Settings.css";
import { FaMapMarkerAlt, FaSync, FaUsers } from "react-icons/fa";
import { isOpenVpnStack, VpnServerType } from "../constants/vpnServerType";
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
    VpnServerResponse,
    VpnServerWithStatusV2Dto,
    VpnServerWithStatusesV3Response,
} from "../api/orvalModelShim";

import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import { useGetApiOpenVpnConfigsGetVpnServerId } from "../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config";
import { useGetApiOpenVpnServersConflogHistoryByServerVpnServerId } from "../api/orval/vpn-server-conflog/vpn-server-conflog";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import {
    useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
    getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
} from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { QuotaPlansResponse, QuotaPlanAllowedServerDto } from "../api/orvalModelShim";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import { formatDateWithOffset } from "../utils/utils";
import { useProxyTrafficFlow } from "../hooks/useProxyTrafficFlow";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import { QuotaPlanViewOnlyNotice } from "../components/servers/QuotaPlanViewOnlyNotice";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { isHttpForbidden } from "../utils/httpError";
import { useGetApiV3OpenVpnServersGetAllWithStatus } from "../api/orval/vpn-servers-v3/vpn-servers-v3";

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

const MIN_PROXY_TRAFFIC_FLOW_VERSION = "1.2.5.54";

function parseVersionParts(raw: string): number[] {
    return raw
        .split(".")
        .map((part) => Number.parseInt(part, 10))
        .filter((part) => Number.isFinite(part));
}

function compareDotVersions(left: string, right: string): number {
    const a = parseVersionParts(left);
    const b = parseVersionParts(right);
    const len = Math.max(a.length, b.length);

    for (let i = 0; i < len; i += 1) {
        const ai = a[i] ?? 0;
        const bi = b[i] ?? 0;
        if (ai > bi) return 1;
        if (ai < bi) return -1;
    }

    return 0;
}

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
    const [pageSize, setPageSize] = usePersistedPageSize(
        `clients:${vpnServerId ?? "0"}`,
        10,
        "5,10,20,50,100",
    );
    const [planNameById, setPlanNameById] = useState<Map<number, string>>(new Map());

    const numericServerId = useMemo(
        () => (vpnServerId ? Number(vpnServerId) : undefined),
        [vpnServerId]
    );

    const canManage = isAdmin(getCurrentUser());
    const v3ServersWithStatusQuery = useGetApiV3OpenVpnServersGetAllWithStatus(
        { includeDeleted: canManage },
        {
            query: {
                enabled: Number.isFinite(numericServerId),
                staleTime: 60_000,
            },
        },
    );

    const v3ServerWithStatus = useMemo((): VpnServerWithStatusV2Dto | undefined => {
        if (!Number.isFinite(numericServerId)) return undefined;
        const payload = unwrapMaybeApiResponse<VpnServerWithStatusesV3Response>(
            v3ServersWithStatusQuery.data as never,
        );
        const list =
            payload?.vpnServerWithStatuses ??
            payload?.openVpnServerWithStatuses ??
            [];
        return list.find((item) => item.vpnServerResponses?.vpnServer?.id === numericServerId);
    }, [numericServerId, v3ServersWithStatusQuery.data]);

    const quotaViewOnly =
        !canManage &&
        Number.isFinite(numericServerId) &&
        v3ServerWithStatus?.vpnServerResponses?.vpnServer?.isAccessibleForUserQuotaPlan === false;

    const [pageState, setPageState] = useState({
        isLive,
        serverId: numericServerId,
        page: 0,
    });
    if (pageState.isLive !== isLive || pageState.serverId !== numericServerId) {
        setPageState({ isLive, serverId: numericServerId, page: 0 });
    }
    const page = pageState.page;
    const setPage = (next: number) => setPageState((s) => ({ ...s, page: next }));

    const handleClientsPageSizeChange = (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(0);
    };

    const readStoredLiveRefreshSeconds = (serverId: number): number => {
        const storageKey = `server-live-refresh-seconds:${serverId}`;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return 5;
        const parsed = Number.parseInt(raw, 10);
        return [0, 1, 5, 10, 15].includes(parsed) ? parsed : 5;
    };

    const [liveRefreshState, setLiveRefreshState] = useState({
        serverId: numericServerId,
        seconds: 5,
    });
    if (
        Number.isFinite(numericServerId) &&
        (numericServerId ?? 0) > 0 &&
        liveRefreshState.serverId !== numericServerId
    ) {
        setLiveRefreshState({
            serverId: numericServerId,
            seconds: readStoredLiveRefreshSeconds(numericServerId!),
        });
    }
    const liveRefreshSeconds = liveRefreshState.seconds;
    const setLiveRefreshSeconds = (seconds: number) =>
        setLiveRefreshState((s) => ({ ...s, seconds }));

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

    const mapConnectedParams: GetApiOpenVpnClientsGetAllConnectedParams = useMemo(
        () => ({
            VpnServerId: numericServerId ?? 0,
            Page: 1,
            PageSize: 1000,
        }),
        [numericServerId]
    );

    const historyParams: GetApiOpenVpnClientsGetAllHistoryParams = useMemo(
        () => ({
            VpnServerId: numericServerId ?? 0,
            Page: page + 1,
            PageSize: pageSize,
        }),
        [numericServerId, page, pageSize]
    );

    const serverBasicQuery = useGetApiOpenVpnServersGetVpnServerId(numericServerId ?? 0, {
        query: {
            enabled:
                canManage &&
                Number.isFinite(numericServerId) &&
                v3ServersWithStatusQuery.isSuccess &&
                !v3ServerWithStatus,
            staleTime: 30000,
            retry: 1,
        },
    });

    const serverKindReady =
        Boolean(v3ServerWithStatus) || serverBasicQuery.isSuccess;
    const scopedStackType =
        v3ServerWithStatus?.vpnServerResponses?.vpnServer?.serverType ??
        (serverBasicQuery.data as unknown as VpnServerResponse | undefined)?.vpnServer?.serverType;
    const openVpnQueriesEnabled =
        Number.isFinite(numericServerId) && serverKindReady && isOpenVpnStack(scopedStackType);
    const xrayClientsEnabled =
        Number.isFinite(numericServerId) && serverKindReady && scopedStackType === VpnServerType.Xray;
    const clientInsightsEnabled = openVpnQueriesEnabled || xrayClientsEnabled;

    const connectedQuery = useGetApiOpenVpnClientsGetAllConnected(connectedParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && isLive && clientInsightsEnabled,
            staleTime: 10000,
            refetchInterval: isLive && liveRefreshSeconds > 0 ? liveRefreshSeconds * 1000 : false,
            retry: 1,
            placeholderData: keepPreviousData,
        },
    });

    const mapConnectedQuery = useGetApiOpenVpnClientsGetAllConnected(mapConnectedParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && isLive && clientInsightsEnabled,
            staleTime: 10000,
            refetchInterval: isLive && liveRefreshSeconds > 0 ? liveRefreshSeconds * 1000 : false,
            retry: 1,
        },
    });

    const historyQuery = useGetApiOpenVpnClientsGetAllHistory(historyParams, {
        query: {
            enabled: Number.isFinite(numericServerId) && !isLive && clientInsightsEnabled,
            staleTime: 10000,
            retry: 1,
            placeholderData: keepPreviousData,
        },
    });

    const loadingClients =
        (isLive ? connectedQuery.isFetching : historyQuery.isFetching) ?? false;

    const clientsAccessDenied =
        clientInsightsEnabled &&
        ((isLive &&
            (isHttpForbidden(connectedQuery.error) || isHttpForbidden(mapConnectedQuery.error))) ||
            (!isLive && isHttpForbidden(historyQuery.error)));

    const xrayClientsQueryErrorMessage =
        clientsAccessDenied
            ? null
            : isLive && connectedQuery.isError
              ? connectedQuery.error instanceof Error
                  ? connectedQuery.error.message
                  : String(connectedQuery.error ?? "Request failed")
              : !isLive && historyQuery.isError
                ? historyQuery.error instanceof Error
                    ? historyQuery.error.message
                    : String(historyQuery.error ?? "Request failed")
                : null;

    const activeClientsResponse = useMemo(
        () =>
            unwrapMaybeApiResponse<ConnectedClientsResponse>(
                (isLive ? connectedQuery.data : historyQuery.data) as never,
            ),
        [isLive, connectedQuery.data, historyQuery.data],
    );

    const clients: VpnClientInfoDto[] = activeClientsResponse?.vpnClients ?? [];
    const mapLiveClientsResponse = useMemo(
        () => unwrapMaybeApiResponse<ConnectedClientsResponse>(mapConnectedQuery.data as never),
        [mapConnectedQuery.data],
    );
    const mapClients: VpnClientInfoDto[] = isLive
        ? mapLiveClientsResponse?.vpnClients ?? clients
        : clients;

    const totalClients =
        typeof activeClientsResponse?.totalCount === "number" && activeClientsResponse.totalCount >= 0
            ? activeClientsResponse.totalCount
            : 0;

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
    const openVpnRuntimeVersion = useMemo(() => {
        const statusVersionRaw = v3ServerWithStatus?.vpnServerStatusLogResponse?.version;
        const statusVersion = typeof statusVersionRaw === "string" ? statusVersionRaw.trim() : "";
        if (statusVersion.length > 0) return statusVersion;

        const conflogVersion = latestConflogPayload?.version?.trim() ?? "";
        return conflogVersion.length > 0 ? conflogVersion : null;
    }, [v3ServerWithStatus, latestConflogPayload?.version]);

    const proxyTrafficFlowSupported = useMemo(() => {
        if (!openVpnQueriesEnabled) return false;
        if (!openVpnRuntimeVersion) return false;
        return compareDotVersions(openVpnRuntimeVersion, MIN_PROXY_TRAFFIC_FLOW_VERSION) >= 0;
    }, [openVpnQueriesEnabled, openVpnRuntimeVersion]);

    const proxyTrafficFlowUnsupportedReason = useMemo(() => {
        if (!openVpnQueriesEnabled) return null;
        if (!openVpnRuntimeVersion) {
            return `unavailable (server version is unknown, required >= ${MIN_PROXY_TRAFFIC_FLOW_VERSION})`;
        }
        if (!proxyTrafficFlowSupported) {
            return `unsupported on ${openVpnRuntimeVersion} (required >= ${MIN_PROXY_TRAFFIC_FLOW_VERSION})`;
        }
        return null;
    }, [openVpnQueriesEnabled, openVpnRuntimeVersion, proxyTrafficFlowSupported]);

    const loadingServer =
        v3ServersWithStatusQuery.isFetching || serverBasicQuery.isFetching;

    const serverWithStatus: VpnServerWithStatusDto | undefined = v3ServerWithStatus;

    const serverBasicPayload = serverBasicQuery.data as unknown as VpnServerResponse | undefined;

    const serverEntity: VpnServerDto | undefined =
        serverWithStatus?.vpnServerResponses?.vpnServer ?? serverBasicPayload?.vpnServer;

    const trafficFlowHub = useProxyTrafficFlow(isLive && proxyTrafficFlowSupported, numericServerId);

    const serverLocation = useMemo<[number, number] | null>(() => {
        const lat = serverEntity?.latitude;
        const lon = serverEntity?.longitude;

        if (typeof lat === "number" && typeof lon === "number") return [lat, lon];
        return null;
    }, [serverEntity]);

    const serverName = serverEntity?.serverName ?? null;

    const serverInfo = useMemo(() => {
        if (v3ServerWithStatus) {
            return v3ServerWithStatus;
        }

        const basic = serverBasicQuery.data as unknown as VpnServerResponse | undefined;
        if (basic) {
            return basic;
        }

        return null;
    }, [v3ServerWithStatus, serverBasicQuery.data]);

    useEffect(() => {
        if (!Number.isFinite(numericServerId) || (numericServerId ?? 0) <= 0) return;
        const storageKey = `server-live-refresh-seconds:${numericServerId}`;
        localStorage.setItem(storageKey, String(liveRefreshSeconds));
    }, [numericServerId, liveRefreshSeconds]);

    const handleRefresh = () => {
        if (clientInsightsEnabled) {
            if (isLive) connectedQuery.refetch();
            else historyQuery.refetch();
        }
        if (openVpnQueriesEnabled) {
            latestConflogQuery.refetch();
        }

        void v3ServersWithStatusQuery.refetch();
        void serverBasicQuery.refetch();

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
        <div className="server-details__root">
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

                    {clientInsightsEnabled ? (
                        <>
                            <label className="square-toggle">
                                <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
                                <span className="toggle-slider"></span>
                                <span className="toggle-text">{isLive ? "Live" : "History"}</span>
                            </label>
                            {isLive ? (
                                <label className="server-details__auto-refresh-label">
                                    <span className="server-details__auto-refresh-label__text">Auto refresh:</span>
                                    <select
                                        className="btn secondary dropdown-select"
                                        value={liveRefreshSeconds}
                                        onChange={(e) => {
                                            const next = Number.parseInt(e.target.value, 10);
                                            if ([0, 1, 5, 10, 15].includes(next)) {
                                                setLiveRefreshSeconds(next);
                                            }
                                        }}
                                    >
                                        <option value={0}>Disabled</option>
                                        <option value={1}>1s</option>
                                        <option value={5}>5s</option>
                                        <option value={10}>10s</option>
                                        <option value={15}>15s</option>
                                    </select>
                                </label>
                            ) : null}
                        </>
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

            {quotaViewOnly ? <QuotaPlanViewOnlyNotice /> : null}

            {clientsAccessDenied ? (
                <ServerAccessDenied />
            ) : null}

            {clientInsightsEnabled && !clientsAccessDenied ? (
                <>
                    <section className="server-details__panel" aria-labelledby="server-vpn-clients-heading">
                        <h3 id="server-vpn-clients-heading" className="settings-card__h3-with-icon">
                            <FaUsers className="icon" aria-hidden />
                            <span>
                                {xrayClientsEnabled ? "Clients (synced)" : "VPN Clients"} (
                                {isLive ? "Connected" : "Historical"})
                                {loadingClients && (
                                    <span className="server-details__loading-hint"> loading…</span>
                                )}
                            </span>
                        </h3>

                        {xrayClientsEnabled ? (
                            <p className="server-details__muted server-details__intro">
                                Sessions are synced from the node agent at{" "}
                                <code className="code-break">{serverEntity?.apiUrl ?? "—"}</code>
                                {" "}
                                by the dashboard background service (same polling interval setting as OpenVPN,{" "}
                                <code>OpenVPN_Polling_Interval</code>). This page refetches the stored list about every
                                10 seconds while open; the &quot;Last poll&quot; time is when the backend last talked to
                                the node.
                                {serverEntity?.xrayClientsPolledAt ? (
                                    <>
                                        {" "}
                                        Last poll: {formatDateWithOffset(new Date(serverEntity.xrayClientsPolledAt))}.
                                    </>
                                ) : null}
                            </p>
                        ) : null}

                        {xrayClientsEnabled &&
                        clients.length === 0 &&
                        !loadingClients &&
                        (Boolean(serverEntity?.xrayClientsPollError) || Boolean(xrayClientsQueryErrorMessage)) ? (
                            <div className="server-details__alert" role="alert">
                                <strong>No sessions shown because polling failed.</strong>
                                {serverEntity?.xrayClientsPollError ? (
                                    <div className="server-details__alert-detail">
                                        {serverEntity.xrayClientsPollError}
                                    </div>
                                ) : null}
                                {xrayClientsQueryErrorMessage ? (
                                    <div className="server-details__alert-detail">
                                        {xrayClientsQueryErrorMessage}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <ClientsTable
                            clients={clients}
                            totalClients={totalClients}
                            page={page}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={handleClientsPageSizeChange}
                            loading={loadingClients}
                            clientsStack={xrayClientsEnabled ? "xray" : "openvpn"}
                            vpnServerId={numericServerId}
                            xrayPollError={serverEntity?.xrayClientsPollError ?? null}
                            xrayQueryErrorMessage={xrayClientsQueryErrorMessage}
                            onXraySessionsChanged={() => {
                                if (isLive) void connectedQuery.refetch();
                                else void historyQuery.refetch();
                                void v3ServersWithStatusQuery.refetch();
                                void serverBasicQuery.refetch();
                            }}
                        />
                    </section>

                    <section className="server-details__panel" aria-labelledby="server-vpn-locations-heading">
                        <h3 id="server-vpn-locations-heading" className="settings-card__h3-with-icon">
                            <FaMapMarkerAlt className="icon" aria-hidden />
                            <span>{xrayClientsEnabled ? "Client locations" : "VPN Client Locations"}</span>
                        </h3>
                        {openVpnQueriesEnabled && isLive ? (
                            <p className="server-details__muted server-details__traffic-hint">
                                Traffic stream:{" "}
                                {proxyTrafficFlowSupported ? (
                                    <>
                                        <code>{trafficFlowHub.connectionState}</code>
                                        {trafficFlowHub.lastError ? ` (${trafficFlowHub.lastError})` : ""}
                                    </>
                                ) : (
                                    <>{proxyTrafficFlowUnsupportedReason}</>
                                )}
                            </p>
                        ) : null}
                        <VpnMap
                            clients={mapClients}
                            serverLocation={serverLocation}
                            serverName={serverName}
                            trafficFlows={openVpnQueriesEnabled && isLive && proxyTrafficFlowSupported ? trafficFlowHub.flows : []}
                        />
                    </section>
                </>
            ) : null}
        </div>
    );
}

export default GeneralServerDetails;
