import { useNavigate, NavLink, Outlet, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import "../css/ServerDetails.css";
import { getServer } from "../utils/api";

export function ServerDetails() {
  const navigate = useNavigate();
  const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
  const [vpnServerName, setVpnServerName] = useState<string>("");

  const tabs = [
    { label: "General", path: "" },
    { label: "Manage Certificates", path: "certificates" },
    { label: "Web console", path: "console" },
    { label: "Configurations", path: "ovpn-file-config" },
    { label: "Statistics", path: "statistics" },
    { label: "Events", path: "events" },
  ];

  const currentPath = location.pathname.split(`/servers/${vpnServerId}/`)[1] || "";

  const handleTabSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(`/servers/${vpnServerId}/${e.target.value}`);
  };

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

      {/* Desktop tabs */}
      <div className="tabs desktop-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/servers/${vpnServerId}/${tab.path}`}
            end={tab.path === ""}
            className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Mobile dropdown */}
      <select
        className="tabs-dropdown mobile-tabs"
        value={currentPath}
        onChange={handleTabSelect}
      >
        {tabs.map((tab) => (
          <option key={tab.path} value={tab.path}>
            {tab.label}
          </option>
        ))}
      </select>

      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  );
}
export default ServerDetails;