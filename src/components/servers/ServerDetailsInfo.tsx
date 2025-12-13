// src/components/ServerDetailsInfo.tsx
import React from "react";
import { BsClock, BsHddNetwork, BsFillBookmarkStarFill, BsPerson } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer, IoMdPerson } from "react-icons/io";

interface Props {
  serverInfo: any; // normalized object from GeneralServerDetails
  toHumanReadableSize: (bytes: number) => string;
  /** show per-field shimmer placeholders */
  loading?: boolean;
}

/** Simple shimmer skeleton */
const Skeleton: React.FC<{ width?: number | string; height?: number | string; className?: string }> = ({
  width = 140,
  height = 14,
  className = "",
}) => (
  <span className={`skeleton ${className}`} style={{ width, height }} aria-label="loading" />
);

const ServerDetailsInfo: React.FC<Props> = ({ serverInfo, toHumanReadableSize, loading = false }) => {
  // When loading, we still render the layout with skeletons
  const safe = serverInfo ?? {};

  const server =
    safe.openVpnServerResponses ??
    (safe.openVpnServer
      ? {
          serverName: safe.openVpnServer.serverName,
          isOnline: !!safe.openVpnServer.isOnline,
          isDefault: !!safe.openVpnServer.isDefault,
          apiUrl: safe.openVpnServer.apiUrl ?? "",
        }
      : null);

  const status = safe.openVpnServerStatusLogResponse ?? null;

  // Early state: if nothing and not loading
  if (!server && !loading) return <p>No server information available.</p>;

  const totalBytesIn = safe.totalBytesIn ?? 0;
  const totalBytesOut = safe.totalBytesOut ?? 0;
  const countConnectedClients = safe.countConnectedClients ?? 0;
  const countSessions = safe.countSessions ?? 0;

  return (
    <div className={`server-info ${loading ? "is-loading" : ""}`}>
      <div className="server-header">
        <div className="server-meta">
          <strong className="server-name">
            {loading ? <Skeleton width={220} height={16} /> : (server?.serverName ?? "(unknown)")}
          </strong>
        </div>
        <div className={`server-status ${server?.isOnline ? "status-online" : "status-offline"}`}>
          {loading ? <Skeleton width={80} /> : server?.isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          <BsClock className="detail-icon" />
          <span className="detail-label">Uptime:</span>
          <span>
            {loading ? (
              <Skeleton width={180} />
            ) : status?.upSince ? new Date(status.upSince).toLocaleString() : "N/A"}
          </span>
        </div>

        <div className="detail-row">
          <RiHardDrive2Line className="detail-icon" />
          <span className="detail-label">Version:</span>
          <span>{loading ? <Skeleton width={90} /> : (status?.version || "Unknown")}</span>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" />
          <span className="detail-label">Local IP:</span>
          <span>{loading ? <Skeleton width={140} /> : (status?.serverLocalIp || "N/A")}</span>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" />
          <span className="detail-label">Remote IP:</span>
          <span>{loading ? <Skeleton width={160} /> : (status?.serverRemoteIp || "N/A")}</span>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Traffic IN:</span>
          <span>{loading ? <Skeleton width={120} /> : toHumanReadableSize(status?.bytesIn ?? 0)}</span>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Traffic OUT:</span>
          <span>{loading ? <Skeleton width={120} /> : toHumanReadableSize(status?.bytesOut ?? 0)}</span>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" />
          <span className="detail-label">Server session Id:</span>
          <span>{loading ? <Skeleton width={280} /> : (status?.sessionId || "N/A")}</span>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Total Traffic IN:</span>
          <span>{loading ? <Skeleton width={130} /> : toHumanReadableSize(totalBytesIn)}</span>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Total Traffic OUT:</span>
          <span>{loading ? <Skeleton width={130} /> : toHumanReadableSize(totalBytesOut)}</span>
        </div>

        <div className="detail-row">
          <IoMdPerson className="detail-icon" />
          <span className="detail-label">Count connected clients:</span>
          <span>{loading ? <Skeleton width={60} /> : countConnectedClients}</span>
        </div>

        <div className="detail-row">
          <BsPerson className="detail-icon" />
          <span className="detail-label">Count sessions:</span>
          <span>{loading ? <Skeleton width={90} /> : countSessions}</span>
        </div>

        <div className="detail-row">
          <BsPerson className="detail-icon" />
          <span className="detail-label">API url:</span>
          <span>
            {loading ? (
              <Skeleton width={260} />
            ) : server?.apiUrl ? (
              <a href={server.apiUrl} target="_blank" rel="noreferrer" style={{ color: "#58a6ff" }}>
                {server.apiUrl}
              </a>
            ) : (
              "N/A"
            )}
          </span>
        </div>

        {!loading && server?.isDefault && (
          <div className="detail-row">
            <BsFillBookmarkStarFill className="detail-icon" />
            <span className="detail-label">Default server</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerDetailsInfo;