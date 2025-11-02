import React from "react";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlayCircle,
  FaPauseCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { BsClock, BsPerson, BsFillBookmarkStarFill } from "react-icons/bs";
import { IoMdPerson } from "react-icons/io";

// take types directly from orval by inferring the item shape of getAllWithStatus()
import { getApiOpenVpnServersGetAllWithStatus } from "../api/orval/open-vpn-servers/open-vpn-servers";
import type { ServiceStatus } from "../api/orval/model/serviceStatus";

// Infer the item type from the orval call result:
// data: { openVpnServerWithStatuses: Array<OrvalServerItem> }
type GetAllWithStatusResp = Awaited<ReturnType<typeof getApiOpenVpnServersGetAllWithStatus>>;
type OrvalServerItem =
  GetAllWithStatusResp extends { data: infer D }
    ? D extends { openVpnServerWithStatuses: infer A }
      ? A extends Array<infer T>
        ? T
        : never
      : never
    : never;

interface Props {
  server: OrvalServerItem;             // strictly from orval
  vpnServerId: number;                 // passed from parent
  serviceStatus: ServiceStatus;        // 0 | 1 | 2
  errorMessage: string | null;
  nextRunTime: string;

  wsCountConnectedClients?: number | null;
  wsCountSessions?: number | null;

  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

// Safe UTC formatting
const formatUtcDate = (utc: string | null | undefined) => {
  if (!utc || utc === "N/A") return "Not Scheduled";
  try {
    const sanitized = utc.replace(/\.\d{6,}Z$/, ".000Z");
    const d = new Date(sanitized);
    if (isNaN(d.getTime())) return "Invalid Date";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "Invalid Date";
  }
};

// Map numeric status (0|1|2) to JSX label
const getStatusLabel = (status: ServiceStatus) => {
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
  wsCountConnectedClients,
  wsCountSessions,
  onView,
  onEdit,
  onDelete,
}) => {
  // orval shape from your debug:
  // {
  //   openVpnServerResponses: { openVpnServer: { id, serverName, isOnline, isDefault, ... } },
  //   openVpnServerStatusLogResponse: { vpnServerId, upSince, ... },
  //   countConnectedClients, countSessions, ...
  // }
  const openVpnServer =
    (server as any)?.openVpnServerResponses?.openVpnServer ??
    (server as any)?.openVpnServerResponses ??
    undefined;

  // Normalize id: prefer model id; if 0 or missing — fallback to status.vpnServerId; else prop
  const resolvedId: number =
    Number(openVpnServer?.id) && Number(openVpnServer?.id) !== 0
      ? Number(openVpnServer.id)
      : Number((server as any)?.openVpnServerStatusLogResponse?.vpnServerId) ||
        Number(vpnServerId);

  const name: string = openVpnServer?.serverName ?? "";
  const isOnline: boolean = !!openVpnServer?.isOnline;
  const isDefault: boolean = !!openVpnServer?.isDefault;

  // Prefer WS numbers, fallback to REST numbers
  const connectedClients: number =
    (wsCountConnectedClients ?? (server as any)?.countConnectedClients ?? 0) as number;
  const sessions: number =
    (wsCountSessions ?? (server as any)?.countSessions ?? 0) as number;

  const upSince: string | null | undefined =
    (server as any)?.openVpnServerStatusLogResponse?.upSince ?? null;

  return (
    <div className="server-item-content">
      <div className="server-header">
        <div className="server-info">
          <strong className="server-name">
            ({vpnServerId !== 0 ? vpnServerId : resolvedId}) {name}
          </strong>
        </div>
        <div className={`server-status ${isOnline ? "status-online" : "status-offline"}`}>
          {isOnline ? "✅ Online" : "❌ Offline"}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          <BsClock className="detail-icon" />
          <span className="detail-label">Uptime:</span>
          <span>{upSince ? new Date(upSince).toLocaleString() : "N/A"}</span>
        </div>

        <div className="detail-row">
          <IoMdPerson className="detail-icon" />
          <span className="detail-label">Count Connected Clients:</span>
          <span>{connectedClients}</span>
        </div>

        <div className="detail-row">
          <BsPerson className="detail-icon" />
          <span className="detail-label">Count Sessions:</span>
          <span>{sessions}</span>
        </div>

        {isDefault && (
          <div className="detail-row">
            <BsFillBookmarkStarFill className="detail-icon" />
            <span className="detail-label">Default server</span>
          </div>
        )}
      </div>

      <div className="server-service">
        <div className="detail-row">{getStatusLabel(serviceStatus)}</div>
        <div className="detail-row">
          <BsClock className="detail-icon" />
          <span className="detail-label">Next Run Time:</span>
          <span>{formatUtcDate(nextRunTime)}</span>
        </div>
        {errorMessage && (
          <div className="error-message">
            <strong>⚠ Error:</strong> {errorMessage}
          </div>
        )}
      </div>

      <div className="server-actions">
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
          className="btn secondary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(resolvedId);
          }}
        >
          <FaEdit className="icon" /> Edit
        </button>
        <button
          className="btn secondary"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(resolvedId);
          }}
        >
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </div>
  );
};

export default ServerItem;