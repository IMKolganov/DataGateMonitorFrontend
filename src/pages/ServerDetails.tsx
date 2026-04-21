// src/pages/ServerDetails.tsx
import { useNavigate, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import type { IconType } from "react-icons";
import {
  FaArrowLeft,
  FaBolt,
  FaChartLine,
  FaCogs,
  FaKey,
  FaServer,
  FaTerminal,
} from "react-icons/fa";
import "../css/ServerDetails.css";

import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import type { VpnServerResponse } from "../api/orval/model";
import { VpnServerType } from "../constants/vpnServerType";

/** Subpaths under `/servers/:id/...` that do not apply to Xray (OpenVPN-only UI). */
function isXrayBlockedSubpath(relative: string): boolean {
    if (!relative) return false;
    const keys = ["console", "events", "statistics"];
    return keys.some((k) => relative === k || relative.startsWith(`${k}/`));
}

type Tab = {
    label: string;
    path: string;
    adminOnly?: boolean;
    Icon: IconType;
    /** Prefix for the mobile dropdown (emoji; native options cannot show SVG). */
    mobilePrefix: string;
};

const ALL_SERVER_TABS: Tab[] = [
    { label: "General", path: "", adminOnly: true, Icon: FaServer, mobilePrefix: "🖥️" },
    {
        label: "Manage Certificates",
        path: "certificates",
        adminOnly: true,
        Icon: FaKey,
        mobilePrefix: "🔐",
    },
    { label: "Web console", path: "console", adminOnly: true, Icon: FaTerminal, mobilePrefix: "⌨️" },
    {
        label: "Configurations",
        path: "ovpn-file-config",
        adminOnly: true,
        Icon: FaCogs,
        mobilePrefix: "⚙️",
    },
    { label: "Statistics", path: "statistics", Icon: FaChartLine, mobilePrefix: "📈" },
    { label: "Events", path: "events", Icon: FaBolt, mobilePrefix: "⚡" },
];

export function ServerDetails() {
    const navigate = useNavigate();
    const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
    const location = useLocation();

    const user = getCurrentUser();
    const canSeeAdminTabs = isAdmin(user);

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

    const payload = serverQuery.data as VpnServerResponse | undefined;
    const isXrayServer =
        serverQuery.isSuccess && payload?.vpnServer?.serverType === VpnServerType.Xray;

    const tabs = useMemo(() => {
        let base = canSeeAdminTabs ? ALL_SERVER_TABS : ALL_SERVER_TABS.filter((t) => !t.adminOnly);
        if (isXrayServer) {
            const xrayHidden = new Set(["console", "events", "statistics"]);
            base = base.filter((t) => !xrayHidden.has(t.path));
            base = base.map((t) => {
                if (t.path === "certificates") {
                    return { ...t, label: "Client links (VLESS)" };
                }
                if (t.path === "ovpn-file-config") {
                    return { ...t, label: "Client export template" };
                }
                return t;
            });
            if (base.length === 0) {
                base = [{ label: "Overview", path: "", adminOnly: false, Icon: FaServer, mobilePrefix: "🖥️" }];
            }
        }
        return base;
    }, [canSeeAdminTabs, isXrayServer]);

    const vpnServerName = payload?.vpnServer?.serverName ?? "(unknown)";

    useEffect(() => {
        if (!serverQuery.isSuccess || !isXrayServer || !vpnServerId) return;
        if (!isXrayBlockedSubpath(currentPath)) return;
        navigate(`/servers/${vpnServerId}`, { replace: true });
    }, [serverQuery.isSuccess, isXrayServer, currentPath, navigate, vpnServerId]);

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
                            <FaArrowLeft className="icon" aria-hidden /> Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="tabs desktop-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.Icon;
                    return (
                        <NavLink
                            key={tab.path || "general"}
                            to={`/servers/${vpnServerId}/${tab.path}`}
                            end={tab.path === ""}
                            className={({ isActive }) =>
                                [isActive ? "tab active-tab" : "tab", "tab--with-icon"].join(" ")
                            }
                        >
                            <Icon className="icon" aria-hidden />
                            <span>{tab.label}</span>
                        </NavLink>
                    );
                })}
            </div>

            <select
                className="tabs-dropdown mobile-tabs"
                value={safeCurrentPath}
                onChange={(e) => navigate(`/servers/${vpnServerId}/${e.target.value}`)}
            >
                {tabs.map((tab) => (
                    <option key={tab.path || "general"} value={tab.path}>
                        {tab.mobilePrefix} {tab.label}
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