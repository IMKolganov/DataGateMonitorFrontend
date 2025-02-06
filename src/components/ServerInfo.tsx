import React from "react";
import { ServerInfo } from "./types";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { formatBytes } from "./utils";

interface ServerInfoProps {
  serverInfo: ServerInfo | null;
}

const ServerInfoComponent: React.FC<ServerInfoProps> = ({ serverInfo }) => {
  if (!serverInfo) return <p>Loading server info...</p>;

  const infoItems = [
    {
      label: "Status",
      value: serverInfo.sessionId ? (
        <FaCheckCircle style={{ color: "green" }} />
      ) : (
        <FaTimesCircle style={{ color: "red" }} />
      ),
    },
    { label: "Total Bytes In", value: formatBytes(serverInfo.bytesIn ?? 0) },
    { label: "Total Bytes Out", value: formatBytes(serverInfo.bytesOut ?? 0) },
    {
      label: "Up Since",
      value: serverInfo.upSince
        ? new Date(serverInfo.upSince).toLocaleString()
        : "N/A",
    },
    { label: "Local IP Address", value: serverInfo.serverLocalIp || "N/A" },
    { label: "Remote IP Address", value: serverInfo.serverRemoteIp || "N/A" },
    { label: "OpenVPN Version", value: serverInfo.version || "Unknown" },
  ];

  return (
    <div className="server-info-container">
      {infoItems.map((item, index) => (
        <div key={index} className="server-info-item fade-in">
          <div className="label">{item.label}</div>
          <div className="divider"></div>
          <div className="value">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

export default ServerInfoComponent;
