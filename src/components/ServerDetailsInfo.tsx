import React from "react";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";

interface Props {
  serverInfo: any;
  toHumanReadableSize: (bytes: number) => string;
}

const ServerDetailsInfo: React.FC<Props> = ({ serverInfo, toHumanReadableSize }) => {
  if (!serverInfo?.openVpnServerStatusLogResponse) return <p>No server information available.</p>;

  return (
    <div className="server-info">
        <div className="server-header">
            <div className="server-info">
                <strong className="server-name">{serverInfo.openVpnServerResponses.serverName}</strong>
            </div>
            <div className={`server-status ${serverInfo.openVpnServerResponses.isOnline ? "status-online" : "status-offline"}`}>
                {serverInfo.openVpnServerResponses.isOnline ? "Online" : "Offline"}
            </div>
        </div>

        <div className="server-details">
        <div className="detail-row">
            <BsClock className="detail-icon" />
            <span className="detail-label">Uptime:</span>
            <span>{serverInfo.openVpnServerStatusLogResponse.upSince ? new Date(serverInfo.openVpnServerStatusLogResponse.upSince).toLocaleString() : "N/A"}</span>
        </div>
        <div className="detail-row">
            <RiHardDrive2Line className="detail-icon" />
            <span className="detail-label">Version:</span>
            <span>{serverInfo.openVpnServerStatusLogResponse.version || "Unknown"}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Local IP:</span>
            <span>{serverInfo.openVpnServerStatusLogResponse.serverLocalIp || "N/A"}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Remote IP:</span>
            <span>{serverInfo.openVpnServerStatusLogResponse.serverRemoteIp || "N/A"}</span>
        </div>
        <div className="detail-row">
            <IoIosSpeedometer className="detail-icon" />
            <span className="detail-label">Traffic IN:</span>
            <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLogResponse.bytesIn || 0)}</span>
        </div>
        <div className="detail-row">
            <IoIosSpeedometer className="detail-icon" />
            <span className="detail-label">Traffic OUT:</span>
            <span>{toHumanReadableSize(serverInfo.openVpnServerStatusLogResponse.bytesOut || 0)}</span>
        </div>
        <div className="detail-row">
            <BsHddNetwork className="detail-icon" />
            <span className="detail-label">Session Id:</span>
            <span>{serverInfo.openVpnServerStatusLogResponse.sessionId || "N/A"}</span>
        </div>
        </div>
    </div>
  );
};

export default ServerDetailsInfo;
