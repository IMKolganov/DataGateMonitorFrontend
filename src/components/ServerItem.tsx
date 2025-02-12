import React from "react";
import { OpenVpnServerInfoResponse } from "../utils/types";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";

interface Props {
  server: OpenVpnServerInfoResponse;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const toHumanReadableSize = (bytes: number): string => {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${sizes[i]}`;
};

const ServerItem: React.FC<Props> = ({ server, onView, onEdit, onDelete }) => {
  return (
    <li className="server-item">
      <div className="server-header">
        <div className="server-info">
          <strong className="server-name">{server.openVpnServer.serverName}</strong>
        </div>
        <div className={`server-status ${server.openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
          {server.openVpnServer.isOnline ? "Online" : "Offline"}
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

      <div className="server-actions">
        <button className="btn normal" onClick={() => onView(server.openVpnServer.id)}>
          <FaEye className="icon" /> View
        </button>
        <button className="btn warning" onClick={() => onEdit(server.openVpnServer.id)}>
          <FaEdit className="icon" /> Edit
        </button>
        <button className="btn danger" disabled={server.openVpnServer.isOnline} onClick={() => onDelete(server.openVpnServer.id)}>
          <FaTrash className="icon" /> Delete
        </button>
      </div>
    </li>
  );
};

export default ServerItem;
