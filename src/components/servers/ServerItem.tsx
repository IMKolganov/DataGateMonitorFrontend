import React from "react";
import {
    FaEye,
    FaEdit,
    FaTrash,
    FaPlayCircle,
    FaTimesCircle,
    FaUser,
    FaLink,
    FaGlobe,
    FaStar,
    FaClock,
    FaTag,
} from "react-icons/fa";
import type {
    ServiceStatus,
    VpnServerV2Dto,
    VpnServerWithStatusDto,
    VpnServerWithStatusV2Dto,
} from "../../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { vpnServerTypeLabel } from "../../constants/vpnServerType";
import { VpnStackLogo } from "./VpnStackLogo";
import { UNGROUPED_GROUP_ID, type GroupAssignTarget } from "../../utils/serverGroups";

interface Props {
    /** v2 includes quota plan groups and accessibility; v1 kept for detail pages still on legacy GET. */
    server: VpnServerWithStatusDto | VpnServerWithStatusV2Dto;
    vpnServerId: number;
    /** null until the status-stream hub sends service status for this server. */
    serviceStatus: ServiceStatus | null;
    errorMessage: string | null;
    nextRunTime: string;
    /** null = use REST isOnline; true/false = live override from hub when backend sends IsOnline. */
    wsOnline: boolean | null;

    wsCountConnectedClients?: number | null;
    wsCountSessions?: number | null;
    isCurrentUserConnected?: boolean;

    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    groups?: { id: number; name: string }[];
    currentGroupId?: number | null;
    onAssignGroup?: (serverId: number, target: GroupAssignTarget) => void;
}

const formatUtcDate = (utc: string | null | undefined) => {
    if (!utc || utc === "N/A") return "Not Scheduled";
    try {
        const sanitized = utc.replace(/\.\d{6,}Z$/, ".000Z");
        const d = new Date(sanitized);
        if (Number.isNaN(d.getTime())) return "Invalid Date";
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
            d.getHours(),
        )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
        return "Invalid Date";
    }
};

const statusIcon = (status: ServiceStatus | null) => {
    if (status === null || Number(status) === 0) {
        return <FaClock className="detail-icon" aria-hidden />;
    }
    if (Number(status) === 1) {
        return <FaPlayCircle className="detail-icon" aria-hidden />;
    }
    return <FaTimesCircle className="detail-icon" aria-hidden />;
};

const statusTone = (status: ServiceStatus | null) => {
    if (status === null) return "idle";
    const s = Number(status);
    if (s === 1) return "running";
    if (s === 0) return "idle";
    if (s === 2) return "error";
    return "unknown";
};

const statusValue = (status: ServiceStatus | null) => {
    if (status === null) return "…";
    const s = Number(status);
    if (s === 1) return "Running";
    if (s === 0) return "Idle";
    if (s === 2) return "Error";
    return "Unknown";
};

const ServerItem: React.FC<Props> = ({
                                         server,
                                         vpnServerId,
                                         serviceStatus,
                                         errorMessage,
                                         nextRunTime,
                                         wsOnline,
                                         wsCountConnectedClients,
                                         isCurrentUserConnected,
                                         onView,
                                         onEdit,
                                         onDelete,
                                         groups = [],
                                         currentGroupId = null,
                                         onAssignGroup,
                                     }) => {
    const user = getCurrentUser();
    const canManage = isAdmin(user);

    const vpnServer = server.vpnServerResponses?.vpnServer ?? null;

    const resolvedId =
        vpnServer?.id ??
        server.vpnServerStatusLogResponse?.vpnServerId ??
        vpnServerId;

    const name = vpnServer?.serverName ?? "";
    const stackLabel = vpnServerTypeLabel(vpnServer?.serverType as number | undefined);
    const isOnlineFromApi = !!vpnServer?.isOnline;
    const isOnline = wsOnline === null ? isOnlineFromApi : wsOnline;
    const isDefault = !!vpnServer?.isDefault;
    const isDisabled = Boolean(vpnServer?.isDisabled);
    const isDeleted = Boolean(vpnServer?.isDeleted);

    const connectedClients =
        wsCountConnectedClients ?? server.countConnectedClients ?? 0;

    const apiUrl = vpnServer?.apiUrl ?? null;
    const statusLog = server.vpnServerStatusLogResponse;
    const serverIp = statusLog?.serverRemoteIp ?? statusLog?.serverLocalIp ?? null;

    const v2Server = vpnServer as VpnServerV2Dto | null;
    const quotaPlanGroups = v2Server?.quotaPlanGroups?.filter((g) => g?.name) ?? [];
    const accessibleByQuotaPlan = v2Server?.isAccessibleForUserQuotaPlan;

    return (
        <div className="server-item-content">
            <div className="server-header">
                <div className="server-info">
                    <strong className="server-name">
                        ({vpnServerId !== 0 ? vpnServerId : resolvedId}) {name}
                        <span className="server-connected-count" title="Connected clients">
                            ({connectedClients})
                        </span>
                        <span
                            style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                            }}
                        >
                            {stackLabel}
                        </span>
                        {isDeleted && (
                            <span
                                className="server-deleted-pill"
                                title="Server is soft-deleted and hidden from the default list."
                            >
                                Deleted
                            </span>
                        )}
                        {isDisabled && (
                            <span
                                className="server-disabled-pill"
                                title="Background polling is off for this server; card stays clickable."
                            >
                                Polling off
                            </span>
                        )}
                        {server.isManagerUpdateAvailable && (
                            <span
                                className="server-update-pill"
                                title={
                                    `Manager update available: ${
                                        server.installedManagerVersion ?? "?"
                                    } → ${server.latestManagerVersion ?? "?"}`
                                }
                            >
                                Update
                            </span>
                        )}
                    </strong>
                    {quotaPlanGroups.length > 0 && (
                        <div
                            className="server-quota-plans"
                            style={{ marginTop: 4, fontSize: 11, color: "var(--text-secondary)" }}
                        >
                            Quota plans:{" "}
                            {quotaPlanGroups.map((g) => g?.name).filter(Boolean).join(", ")}
                        </div>
                    )}
                    {accessibleByQuotaPlan === false && !canManage && (
                        <div className="server-quota-restricted">
                            Not included in your quota plan (view only).
                        </div>
                    )}
                </div>
                <div className={`server-status ${isOnline ? "status-online" : "status-offline"}`}>
                    <VpnStackLogo
                        serverType={vpnServer?.serverType as number | undefined}
                        size={18}
                    />
                    {isOnline ? "✅ Online" : "❌ Offline"}
                </div>
            </div>
            {canManage && onAssignGroup && (
                <label className="server-group-assign" onClick={(e) => e.stopPropagation()}>
                    <span className="server-group-assign__label">Group</span>
                    <select
                        className="input"
                        value={currentGroupId != null ? String(currentGroupId) : UNGROUPED_GROUP_ID}
                        aria-label="Move to group"
                        onChange={(e) => {
                            const raw = e.target.value;
                            const target: GroupAssignTarget =
                                raw === UNGROUPED_GROUP_ID ? UNGROUPED_GROUP_ID : Number(raw);
                            onAssignGroup(resolvedId, target);
                        }}
                    >
                        <option value={UNGROUPED_GROUP_ID}>Ungrouped</option>
                        {groups.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {isCurrentUserConnected ? (
                <div className="server-self-connected-note">
                    You are currently connected to this server.
                </div>
            ) : null}

            <div className="server-details">
                <div className="detail-row">
                    <FaUser className="detail-icon" aria-hidden />
                    <span className="detail-label">Clients</span>
                    <span className="detail-value">{connectedClients}</span>
                </div>

                {apiUrl && (
                    <div className="detail-row">
                        <FaLink className="detail-icon" aria-hidden />
                        <span className="detail-label">API</span>
                        <a href={apiUrl} target="_blank" rel="noreferrer" className="detail-link" onClick={(e) => e.stopPropagation()}>
                            {apiUrl}
                        </a>
                    </div>
                )}

                {serverIp && (
                    <div className="detail-row">
                        <FaGlobe className="detail-icon" aria-hidden />
                        <span className="detail-label">IP</span>
                        <span className="detail-value">{serverIp}</span>
                    </div>
                )}

                {isDefault && (
                    <div className="detail-row detail-row--flag">
                        <FaStar className="detail-icon" aria-hidden />
                        <span className="detail-label">Default server</span>
                    </div>
                )}

                <div className="detail-row">
                    {statusIcon(serviceStatus)}
                    <span className="detail-label">Status</span>
                    <span
                        className={`detail-value status-indicator ${statusTone(serviceStatus)}`}
                        title={
                            serviceStatus === null
                                ? "Waiting for live status from the background service"
                                : undefined
                        }
                    >
                        {statusValue(serviceStatus)}
                    </span>
                </div>
                <div className="detail-row">
                    <FaClock className="detail-icon" aria-hidden />
                    <span className="detail-label">Next run</span>
                    <span className="detail-value">{formatUtcDate(nextRunTime)}</span>
                </div>
                {errorMessage && (
                    <div className="error-message">
                        <strong>⚠ Error:</strong> {errorMessage}
                    </div>
                )}

                {Array.isArray(vpnServer?.tags) && vpnServer.tags.length > 0 && (
                    <div className="detail-row">
                        <FaTag className="detail-icon" aria-hidden />
                        <span className="detail-label">Tags</span>
                        <span className="server-tags-list">
                            {vpnServer.tags.map((tag) => (
                                <span key={tag} className="server-tag-pill">
                                    {tag}
                                </span>
                            ))}
                        </span>
                    </div>
                )}
            </div>

            <div className="server-actions">
                <div className="server-actions-buttons">
                    <button
                        className="btn secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onView(resolvedId);
                        }}
                    >
                        <FaEye className="icon" /> View
                    </button>

                    <button
                        type="button"
                        className="btn secondary"
                        disabled={!canManage}
                        title={!canManage ? "Admin only" : undefined}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!canManage) return;
                            onEdit(resolvedId);
                        }}
                    >
                        <FaEdit className="icon" /> Edit
                    </button>

                    <button
                        type="button"
                        className="btn secondary"
                        disabled={!canManage || isDeleted}
                        title={
                            !canManage
                                ? "Admin only"
                                : isDeleted
                                  ? "Server is already deleted"
                                  : undefined
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!canManage || isDeleted) return;
                            onDelete(resolvedId);
                        }}
                    >
                        <FaTrash className="icon" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServerItem;