import { useNavigate, NavLink, Outlet, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import "../css/ServerDetails.css";
import { getServer } from "../utils/api";

export function ServerDetails() {
  const navigate = useNavigate();
  const { vpnServerId } = useParams<{ vpnServerId: string }>();
  const [vpnServerName, setVpnServerName] = useState<string>("");

  useEffect(() => {
    const fetchServer = async () => {
      if (!vpnServerId) return;
      try {
        const server = await getServer(vpnServerId);
        setVpnServerName(server.serverName || "(unknown)");
      } catch (error) {
        console.error("Failed to load VPN server:", error);
        setVpnServerName("(unknown)");
      }
    };

    fetchServer();
  }, [vpnServerId]);

  return (
    <div>
      <h2>Server Details for Server {vpnServerName || vpnServerId}</h2>

      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              {FaArrowLeft({ className: "icon" })} Back
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        <NavLink
          to={`/servers/${vpnServerId}`}
          end
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          General
        </NavLink>
        <NavLink
          to={`/servers/${vpnServerId}/certificates`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Manage Certificates
        </NavLink>
        <NavLink
          to={`/servers/${vpnServerId}/console`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Web console
        </NavLink>

        <NavLink
          to={`/servers/${vpnServerId}/ovpn-file-config`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Configurations
        </NavLink>

        <NavLink
          to={`/servers/${vpnServerId}/statistics`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Statistics
        </NavLink>

        <NavLink
          to={`/servers/${vpnServerId}/events`}
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          Events
        </NavLink>
      </div>

      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  );
}

export default ServerDetails;
