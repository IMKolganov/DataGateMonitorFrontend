import React from "react";
import { OpenVpnServerInfoResponse, ServiceStatus } from "../utils/types";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { FaPlayCircle, FaPauseCircle, FaTimesCircle } from "react-icons/fa";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";

interface Props {
  server: OpenVpnServerInfoResponse;
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
    // Убираем избыточные миллисекунды (оставляем только 3 знака после точки)
    const sanitizedUtcString = utcDateString.replace(/\.\d{6,}Z$/, ".000Z");

    const date = new Date(sanitizedUtcString);
    if (isNaN(date.getTime())) throw new Error("Invalid Date");

    // Форматируем в `YYYY-MM-DD HH:mm:ss`
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("❌ Error formatting date:", error);
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

const ServerItem: React.FC<Props> = ({ server, serviceStatus, errorMessage, nextRunTime, onView, onEdit, onDelete }) => {
  return (
    <li className="server-item">
      <div className="server-header">
        <div className="server-info">
          <strong className="server-name">{server.openVpnServer.serverName}</strong>
        </div>
        <div className={`server-status ${server.openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
          {server.openVpnServer.isOnline ? "✅ Online" : "❌ Offline"}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          <BsClock className="detail-icon" />
          <span className="detail-label">Uptime:</span>
          <span>{server.openVpnServerStatusLog?.upSince ? new Date(server.openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span>
        </div>
        <div className="detail-row">
          <RiHardDrive2Line className="detail-icon" />
          <span className="detail-label">Version:</span>
          <span>{server.openVpnServerStatusLog?.version || "Unknown"}</span>
        </div>
        <div className="detail-row">
          <BsHddNetwork className="detail-icon" />
          <span className="detail-label">Management:</span>
          <span>{server.openVpnServer.managementIp}:{server.openVpnServer.managementPort}</span>
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
        <button className="btn normal" onClick={() => onView(server.openVpnServer.id)}>
          <FaEye className="icon" /> View
        </button>
        <button className="btn warning" onClick={() => onEdit(server.openVpnServer.id)}>
          <FaEdit className="icon" /> Edit
        </button>
        <button
          className="btn danger"
          onClick={() => onDelete(server.openVpnServer.id)}
        >
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </li>
  );
};

export default ServerItem;
