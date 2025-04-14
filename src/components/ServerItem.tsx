import React from "react";
import { OpenVpnServerData, ServiceStatus } from "../utils/types";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { BsClock, BsHddNetwork, BsPerson, BsFillBookmarkStarFill } from "react-icons/bs";
import { FaPlayCircle, FaPauseCircle, FaTimesCircle } from "react-icons/fa";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer, IoMdPerson } from "react-icons/io";

interface Props {
  server: OpenVpnServerData;
  vpnServerId: number;
  serviceStatus: ServiceStatus;
  errorMessage: string | null;
  nextRunTime: string;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const formatUtcDate = (utcDateString: string | null | undefined) => {
  if (!utcDateString || utcDateString === "N/A") return "Not Scheduled";

  try {
    const sanitizedUtcString = utcDateString.replace(/\.\d{6,}Z$/, ".000Z");

    const date = new Date(sanitizedUtcString);
    if (isNaN(date.getTime())) throw new Error("Invalid Date");

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};


const toHumanReadableSize = (bytes: number): string => {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${sizes[i]}`;
};



const getStatusLabel = (status: ServiceStatus) => {
  switch (status) {
    case ServiceStatus.Running:
      return (
        <span className="status-indicator running"> <FaPlayCircle className="status-icon" />  Status Name: Running</span>
      );
    case ServiceStatus.Idle:
      return (
        <span className="status-indicator idle"> <FaPauseCircle className="status-icon" /> Status Name: Idle</span>
      );
    case ServiceStatus.Error:
      return (
        <span className="status-indicator error"> <FaTimesCircle className="status-icon" /> Status Name: Error</span>
      );
    default:
      return (
        <span className="status-indicator unknown"> <FaTimesCircle className="status-icon" /> Status Name: ❓ Unknown</span>
      );
  }
};

const ServerItem: React.FC<Props> = ({ server, vpnServerId, serviceStatus, errorMessage, nextRunTime, onView, onEdit, onDelete }) => {
  return (
    <li className="server-item">
      <div className="server-header">
        <div className="server-info">
          <strong className="server-name">{server.openVpnServerResponses.serverName}</strong>
        </div>
        <div className={`server-status ${server.openVpnServerResponses.isOnline ? "status-online" : "status-offline"}`}>
          {server.openVpnServerResponses.isOnline ? "✅ Online" : "❌ Offline"}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          <BsClock className="detail-icon" />
          <span className="detail-label">Uptime:</span>
          <span>{server.openVpnServerStatusLogResponse?.upSince ? new Date(server.openVpnServerStatusLogResponse.upSince).toLocaleString() : "N/A"}</span>
        </div>
        <div className="detail-row">
          <RiHardDrive2Line className="detail-icon" />
          <span className="detail-label">Version:</span>
          <span>{server.openVpnServerStatusLogResponse?.version || "Unknown"}</span>
        </div>
        <div className="detail-row">
          <BsHddNetwork className="detail-icon" />
          <span className="detail-label">Management:</span>
          <span>{server.openVpnServerResponses.managementIp}:{server.openVpnServerResponses.managementPort}</span>
        </div>
        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Total Traffic IN:</span>
          <span>{toHumanReadableSize(server.totalBytesIn)}</span>
        </div>
        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" />
          <span className="detail-label">Total Traffic OUT:</span>
          <span>{toHumanReadableSize(server.totalBytesOut)}</span>
        </div>
        <div className="detail-row">
          <IoMdPerson className="detail-icon" />
          <span className="detail-label">Count Connected Clients:</span>
          <span>{server.countConnectedClients}</span>
        </div>
        <div className="detail-row">
          <BsPerson className="detail-icon" />
          <span className="detail-label">Count Sessions:</span>
          <span>{server.countSessions}</span>
        </div>
        {server.openVpnServerResponses.isDefault && (
        <div className="detail-row">
          <BsFillBookmarkStarFill className="detail-icon" />
          <span className="detail-label">Default server</span>
        </div>
        )}
      </div>

      <div className="server-service">
        <div className="detail-row">
          {getStatusLabel(serviceStatus)}
        </div>
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
        <button className="btn secondary" onClick={() => onView(server.openVpnServerResponses.id)}>
          <FaEye className="icon" /> View
        </button>
        <button className="btn secondary" onClick={() => onEdit(server.openVpnServerResponses.id)}>
          <FaEdit className="icon" /> Edit
        </button>
        <button
          className="btn secondary"
          onClick={() => onDelete(server.openVpnServerResponses.id)}
        >
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </li>
  );
};

export default ServerItem;
