import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowLeft,
  FaBell,
  FaClipboardList,
  FaCog,
  FaDatabase,
  FaLaptopCode,
  FaSlidersH,
  FaTelegram,
  FaUsers,
} from "react-icons/fa";
import "../css/Settings.css";

type SettingsTab = {
  label: string;
  path: string;
  Icon: IconType;
  /** Shown in the mobile dropdown (emoji; SVG does not render inside native options). */
  mobilePrefix: string;
};

const SETTINGS_TABS: SettingsTab[] = [
  { label: "General", path: "general", Icon: FaSlidersH, mobilePrefix: "⚙️" },
  { label: "API Clients", path: "applications", Icon: FaLaptopCode, mobilePrefix: "🔌" },
  { label: "Quotas", path: "quotas", Icon: FaClipboardList, mobilePrefix: "📋" },
  { label: "GeoLite DB", path: "geolitedb", Icon: FaDatabase, mobilePrefix: "🌐" },
  { label: "VPN notifications", path: "vpn-notifications", Icon: FaBell, mobilePrefix: "🔔" },
  { label: "Telegram Bot", path: "telegrambot", Icon: FaTelegram, mobilePrefix: "✈️" },
  { label: "Users", path: "users", Icon: FaUsers, mobilePrefix: "👥" },
];

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = SETTINGS_TABS;

  const pathRest = location.pathname.replace(/^\/settings\/?/, "") || "general";
  const currentTab = pathRest.startsWith("users") ? "users" : pathRest.split("/")[0];

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
        value={currentTab}
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
