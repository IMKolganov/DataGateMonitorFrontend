// src/components/ServerDetailsInfo.tsx
import React from "react";
import { BsClock, BsHddNetwork, BsFillBookmarkStarFill, BsPerson } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer, IoMdPerson } from "react-icons/io";

interface Props {
  serverInfo: any;
  toHumanReadableSize: (bytes: number) => string;
}

const ServerDetailsInfo: React.FC<Props> = ({ serverInfo, toHumanReadableSize }) => {
  if (!serverInfo) return <p>No server information available.</p>;

  // поддерживаем обе формы
  const server =
    serverInfo.openVpnServerResponses ??
    (serverInfo.openVpnServer ? {
      serverName: serverInfo.openVpnServer.serverName,
      isOnline: !!serverInfo.openVpnServer.isOnline,
      isDefault: !!serverInfo.openVpnServer.isDefault,
      apiUrl: serverInfo.openVpnServer.apiUrl ?? "",
    } : null);

  const status = serverInfo.openVpnServerStatusLogResponse ?? null;

  if (!server) return <p>No server information available.</p>;

  return (
    <div className="server-info">
      <div className="server-header">
        <div className="server-info">
          <strong className="server-name">{server.serverName ?? "(unknown)"}</strong>
        </div>
        <div className={`server-status ${server.isOnline ? "status-online" : "status-offline"}`}>
          {server.isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          {BsClock({ className: "detail-icon" })}
          <span className="detail-label">Uptime:</span>
          <span>
            {status?.upSince ? new Date(status.upSince).toLocaleString() : "N/A"}
          </span>
        </div>

        <div className="detail-row">
          {RiHardDrive2Line({ className: "detail-icon" })}
          <span className="detail-label">Version:</span>
          <span>{status?.version || "Unknown"}</span>
        </div>

        <div className="detail-row">
          {BsHddNetwork({ className: "detail-icon" })}
          <span className="detail-label">Local IP:</span>
          <span>{status?.serverLocalIp || "N/A"}</span>
        </div>

        <div className="detail-row">
          {BsHddNetwork({ className: "detail-icon" })}
          <span className="detail-label">Remote IP:</span>
          <span>{status?.serverRemoteIp || "N/A"}</span>
        </div>

        <div className="detail-row">
          {IoIosSpeedometer({ className: "detail-icon" })}
          <span className="detail-label">Traffic IN:</span>
          <span>{toHumanReadableSize(status?.bytesIn || 0)}</span>
        </div>

        <div className="detail-row">
          {IoIosSpeedometer({ className: "detail-icon" })}
          <span className="detail-label">Traffic OUT:</span>
          <span>{toHumanReadableSize(status?.bytesOut || 0)}</span>
        </div>

        <div className="detail-row">
          {BsHddNetwork({ className: "detail-icon" })}
          <span className="detail-label">Server session Id:</span>
          <span>{status?.sessionId || "N/A"}</span>
        </div>

        <div className="detail-row">
          {IoIosSpeedometer({ className: "detail-icon" })}
          <span className="detail-label">Total Traffic IN:</span>
          <span>{toHumanReadableSize(serverInfo.totalBytesIn ?? 0)}</span>
        </div>

        <div className="detail-row">
          {IoIosSpeedometer({ className: "detail-icon" })}
          <span className="detail-label">Total Traffic OUT:</span>
          <span>{toHumanReadableSize(serverInfo.totalBytesOut ?? 0)}</span>
        </div>

        <div className="detail-row">
          {IoMdPerson({ className: "detail-icon" })}
          <span className="detail-label">Count connected clients:</span>
          <span>{serverInfo.countConnectedClients ?? 0}</span>
        </div>

        <div className="detail-row">
          {BsPerson({ className: "detail-icon" })}
          <span className="detail-label">Count sessions:</span>
          <span>{serverInfo.countSessions ?? 0}</span>
        </div>

        <div className="detail-row">
          {BsPerson({ className: "detail-icon" })}
          <span className="detail-label">API url:</span>
          <span>{server.apiUrl || "N/A"}</span>
        </div>

        {server.isDefault && (
          <div className="detail-row">
            {BsFillBookmarkStarFill({ className: "detail-icon" })}
            <span className="detail-label">Default server</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerDetailsInfo;