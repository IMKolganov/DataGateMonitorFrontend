import React from "react";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";

interface Props {
  serverInfo: any;
  toHumanReadableSize: (bytes: number) => string;
}

const ServerDetailsInfo: React.FC<Props> = ({ serverInfo, toHumanReadableSize }) => {
  if (!serverInfo?.openVpnServerStatusLog) return <p>No server information available.</p>;

  return (
    <div className="server-info">
        <div className="server-header">
            <div className="server-info">
                <strong className="server-name">{serverInfo.openVpnServer.serverName}</strong>
            </div>
            <div className={`server-status ${serverInfo.openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
                {serverInfo.openVpnServer.isOnline ? "Online" : "Offline"}
            </div>
        </div>

        <div className="server-details">
        <div className="detail-row">
            <BsClock className="detail-icon" />
            <span className="detail-label">Uptime:</span>
            <span>{serverInfo.openVpnServerStatusLog.upSince ? new Date(serverInfo.openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span>
        </div>
        <div className="detail-row">
            <RiHardDrive2Line className="detail-icon" />
            <span className="detail-label">Version:</span>
            <span>{serverInfo.openVpnServerStatusLog.version || "Unknown"}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Local IP:</span>
            <span>{serverInfo.openVpnServerStatusLog.serverLocalIp || "N/A"}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Remote IP:</span>
            <span>{serverInfo.openVpnServerStatusLog.serverRemoteIp || "N/A"}</span>
        </div>
        <div className="detail-row">
            <IoIosSpeedometer className="detail-icon" />
            <span className="detail-label">Traffic IN:</span>
            <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog.bytesIn || 0)}</span>
        </div>
        <div className="detail-row">
            <IoIosSpeedometer className="detail-icon" />
            <span className="detail-label">Traffic OUT:</span>
            <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog.bytesOut || 0)}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Session Id:</span>
            <span>{serverInfo.openVpnServerStatusLog.sessionId || "N/A"}</span>
        </div>
        </div>
    </div>
  );
};

export default ServerDetailsInfo;
