import React from "react";
import {
    FaEye,
    FaEdit,
    FaTrash,
    FaPlayCircle,
    FaPauseCircle,
    FaTimesCircle,
} from "react-icons/fa";
import { BsClock, BsFillBookmarkStarFill, BsTag, BsLink45Deg, BsHddNetwork } from "react-icons/bs";
import { IoMdPerson } from "react-icons/io";
import type {
    ServiceStatus,
    VpnServerV2Dto,
    VpnServerWithStatusDto,
    VpnServerWithStatusV2Dto,
} from "../../api/orval/model";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";

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

    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
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

const getStatusLabel = (status: ServiceStatus | null) => {
    if (status === null) {
        return (
            <span className="status-indicator idle" title="Waiting for live status from the background service">
                <BsClock className="status-icon" /> Service status: …
            </span>
        );
    }
    const s = Number(status);
    if (s === 1) {
        return (
            <span className="status-indicator running">
        <FaPlayCircle className="status-icon" /> Status Name: Running
      </span>
        );
    }
    if (s === 0) {
        return (
            <span className="status-indicator idle">
        <FaPauseCircle className="status-icon" /> Status Name: Idle
      </span>
        );
    }
    if (s === 2) {
        return (
            <span className="status-indicator error">
        <FaTimesCircle className="status-icon" /> Status Name: Error
      </span>
        );
    }
    return (
        <span className="status-indicator unknown">
      <FaTimesCircle className="status-icon" /> Status Name: ❓ Unknown
    </span>
    );
};

const ServerItem: React.FC<Props> = ({
                                         server,
                                         vpnServerId,
                                         serviceStatus,
                                         errorMessage,
                                         nextRunTime,
                                         wsOnline,
                                         wsCountConnectedClients,
                                         onView,
                                         onEdit,
                                         onDelete,
                                     }) => {
    const user = getCurrentUser();
    const canManage = isAdmin(user);

    const vpnServer = server.vpnServerResponses?.vpnServer ?? null;

    const resolvedId =
        vpnServer?.id ??
        server.vpnServerStatusLogResponse?.vpnServerId ??
        vpnServerId;

    const name = vpnServer?.serverName ?? "";
    const isOnlineFromApi = !!vpnServer?.isOnline;
    const isOnline = wsOnline === null ? isOnlineFromApi : wsOnline;
    const isDefault = !!vpnServer?.isDefault;

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
                        <div style={{ marginTop: 4, fontSize: 11, color: "#f85149" }}>
                            Not included in your quota plan (view only).
                        </div>
                    )}
                </div>
                <div className={`server-status ${isOnline ? "status-online" : "status-offline"}`}>
                    {isOnline ? "✅ Online" : "❌ Offline"}
                </div>
            </div>

            <div className="server-details">
                <div className="detail-row">
                    <IoMdPerson className="detail-icon" aria-hidden />
                    <div className="detail-row-main">
                        <span className="detail-label">Count Connected Clients:</span>
                        <span className="detail-value">{connectedClients}</span>
                    </div>
                </div>

                {apiUrl && (
                    <div className="detail-row">
                        <BsLink45Deg className="detail-icon" aria-hidden />
                        <div className="detail-row-main">
                            <span className="detail-label">API:</span>
                            <a href={apiUrl} target="_blank" rel="noreferrer" className="detail-link" onClick={(e) => e.stopPropagation()}>
                                {apiUrl}
                            </a>
                        </div>
                    </div>
                )}

                {serverIp && (
                    <div className="detail-row">
                        <BsHddNetwork className="detail-icon" aria-hidden />
                        <div className="detail-row-main">
                            <span className="detail-label">IP:</span>
                            <span className="detail-value">{serverIp}</span>
                        </div>
                    </div>
                )}

                {isDefault && (
                    <div className="detail-row">
                        <BsFillBookmarkStarFill className="detail-icon" aria-hidden />
                        <div className="detail-row-main">
                            <span className="detail-label">Default server</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="server-service">
                <div className="detail-row detail-row--status">{getStatusLabel(serviceStatus)}</div>
                <div className="detail-row">
                    <BsClock className="detail-icon" aria-hidden />
                    <div className="detail-row-main">
                        <span className="detail-label">Next Run Time:</span>
                        <span className="detail-value">{formatUtcDate(nextRunTime)}</span>
                    </div>
                </div>
                {errorMessage && (
                    <div className="error-message">
                        <strong>⚠ Error:</strong> {errorMessage}
                    </div>
                )}
            </div>

            {Array.isArray(vpnServer?.tags) && vpnServer.tags.length > 0 && (
                <div className="server-tags-block">
                    <div className="detail-row-tags-heading">
                        <BsTag className="detail-icon" />
                        <span className="detail-label">Tags:</span>
                    </div>
                    <span className="server-tags-list">
                        {vpnServer.tags.map((tag) => (
                            <span key={tag} className="server-tag-pill">
                                {tag}
                            </span>
                        ))}
                    </span>
                </div>
            )}

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
                        disabled={!canManage}
                        title={!canManage ? "Admin only" : undefined}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!canManage) return;
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