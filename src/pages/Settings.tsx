import { useMemo } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowLeft,
  FaBell,
  FaBug,
  FaClipboardList,
  FaCog,
  FaDatabase,
  FaEnvelope,
  FaKey,
  FaLaptopCode,
  FaSlidersH,
  FaTelegram,
  FaUsers,
} from "react-icons/fa";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import "../css/Settings.css";

type SettingsTab = {
  label: string;
  path: string;
  Icon: IconType;
  /** Shown in the mobile dropdown (emoji; SVG does not render inside native options). */
  mobilePrefix: string;
};

const ALL_SETTINGS_TABS: SettingsTab[] = [
  { label: "General", path: "general", Icon: FaSlidersH, mobilePrefix: "⚙️" },
  { label: "API Clients", path: "applications", Icon: FaLaptopCode, mobilePrefix: "🔌" },
  { label: "Quotas", path: "quotas", Icon: FaClipboardList, mobilePrefix: "📋" },
  { label: "GeoLite DB", path: "geolitedb", Icon: FaDatabase, mobilePrefix: "🌐" },
  { label: "VPN notifications", path: "vpn-notifications", Icon: FaBell, mobilePrefix: "🔔" },
  { label: "Telegram Bot", path: "telegrambot", Icon: FaTelegram, mobilePrefix: "✈️" },
  { label: "Users", path: "users", Icon: FaUsers, mobilePrefix: "👥" },
  { label: "Email broadcast", path: "email-broadcast", Icon: FaEnvelope, mobilePrefix: "✉️" },
  { label: "Android crashes", path: "android-crashes", Icon: FaBug, mobilePrefix: "🐞" },
  { label: "Admin password", path: "admin-password", Icon: FaKey, mobilePrefix: "🔑" },
];

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = isAdmin(getCurrentUser())
    ? ALL_SETTINGS_TABS
    : ALL_SETTINGS_TABS.filter(
        (t) => t.path !== "admin-password" && t.path !== "android-crashes",
      );

  const pathRest = location.pathname.replace(/^\/settings\/?/, "") || "general";
  const currentTab = pathRest.startsWith("users") ? "users" : pathRest.split("/")[0];
  const tabPaths = useMemo(() => new Set(tabs.map((t) => t.path)), [tabs]);
  const selectTabValue = tabPaths.has(currentTab) ? currentTab : "general";

  const isTabActive = (path: string) => {
    if (path === "users") {
      return (
        location.pathname === "/settings/users" ||
        location.pathname.startsWith("/settings/users/")
      );
    }
    return (
      location.pathname === `/settings/${path}` ||
      location.pathname.startsWith(`/settings/${path}/`)
    );
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(`/settings/${e.target.value}`);
  };

  return (
    <div className="content-wrapper wide-table settings">
      <h2 className="settings-page__h2-with-icon">
        <FaCog className="icon" aria-hidden />
        <span>Settings</span>
      </h2>

      <div className="header-container">
        <p className="settings-description">Configure system settings here.</p>

        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              <FaArrowLeft className="icon" aria-hidden /> Back
            </button>
          </div>
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="tabs desktop-tabs">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          return (
            <Link
              key={tab.path}
              to={`/settings/${tab.path}`}
              className={
                isTabActive(tab.path) ? "tab active-tab tab--with-icon" : "tab tab--with-icon"
              }
            >
              <Icon className="icon" aria-hidden />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile dropdown */}
      <select
        className="tabs-dropdown mobile-tabs"
        value={selectTabValue}
        onChange={handleSelectChange}
      >
        {tabs.map((tab) => (
          <option key={tab.path} value={tab.path}>
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

export default Settings;
