// src/pages/ServerDetails.tsx
import { useNavigate, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import "../css/ServerDetails.css";

// orval
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/open-vpn-servers/open-vpn-servers";
import type { OpenVpnServerResponse } from "../api/orval/model";

// Helper to unwrap ApiResponse<T>
function unwrap<T>(resp: any): T | undefined {
  if (!resp) return undefined;
  if (typeof resp === "object" && "data" in resp) return resp.data as T;
  return resp as T;
}

export function ServerDetails() {
  const navigate = useNavigate();
  const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
  const location = useLocation();

  const tabs = [
    { label: "General", path: "" },
    { label: "Manage Certificates", path: "certificates" },
    { label: "Web console", path: "console" },
    { label: "Configurations", path: "ovpn-file-config" },
    { label: "Statistics", path: "statistics" },
    { label: "Events", path: "events" },
  ];

  // current subpath after /servers/:vpnServerId/
  const currentPath =
    location.pathname.split(`/servers/${vpnServerId}/`)[1] ?? "";

  const numericId = useMemo(
    () => (vpnServerId ? Number(vpnServerId) : undefined),
    [vpnServerId]
  );

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(numericId ?? 0, {
    query: {
      enabled: Number.isFinite(numericId as number),
      staleTime: 10_000,
      retry: 1,
    },
  });

  const payload = unwrap<OpenVpnServerResponse>(serverQuery.data);
  const vpnServerName = payload?.openVpnServer?.serverName ?? "(unknown)";

  return (
    <div>
      <h2>
        Server Details for Server{" "}
        {serverQuery.isLoading ? "…" : vpnServerName || vpnServerId}
      </h2>

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
        onChange={(e) => navigate(`/servers/${vpnServerId}/${e.target.value}`)}
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