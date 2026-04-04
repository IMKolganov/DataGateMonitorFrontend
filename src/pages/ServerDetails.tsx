// src/pages/ServerDetails.tsx
import { useNavigate, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import "../css/ServerDetails.css";

import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/open-vpn-servers/open-vpn-servers";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import type { OpenVpnServerResponse } from "../api/orval/model";

type Tab = {
    label: string;
    path: string;
    adminOnly?: boolean;
};

const ALL_SERVER_TABS: Tab[] = [
    { label: "General", path: "", adminOnly: true },
    { label: "Manage Certificates", path: "certificates", adminOnly: true },
    { label: "Web console", path: "console", adminOnly: true },
    { label: "Configurations", path: "ovpn-file-config", adminOnly: true },
    { label: "Statistics", path: "statistics" },
    { label: "Events", path: "events" },
];

export function ServerDetails() {
    const navigate = useNavigate();
    const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
    const location = useLocation();

    const user = getCurrentUser();
    const canSeeAdminTabs = isAdmin(user);

    const tabs = useMemo(() => {
        if (canSeeAdminTabs) return ALL_SERVER_TABS;
        return ALL_SERVER_TABS.filter((t) => !t.adminOnly);
    }, [canSeeAdminTabs]);

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

    const payload = serverQuery.data as OpenVpnServerResponse | undefined;
    const vpnServerName = payload?.openVpnServer?.serverName ?? "(unknown)";

    const safeCurrentPath = useMemo(() => {
        const exists = tabs.some((t) => t.path === currentPath);
        return exists ? currentPath : "";
    }, [currentPath, tabs]);

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

            <select
                className="tabs-dropdown mobile-tabs"
                value={safeCurrentPath}
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