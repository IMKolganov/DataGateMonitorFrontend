import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../css/Settings.css";
import { appVersion } from "../version";

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: "General", path: "general" },
    { label: "API Clients", path: "applications" },
    { label: "GeoLite DB", path: "geolitedb" },
    { label: "Telegram Bot", path: "telegrambot" },
  ];

  const currentTab = location.pathname.split("/settings/")[1] || "general";

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(`/settings/${e.target.value}`);
  };

  return (
    <div className="content-wrapper wide-table settings">
      <h2>Settings</h2>

      <div className="header-container">
        <p className="settings-description">Configure system settings here.</p>

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
            to={`/settings/${tab.path}`}
            className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Mobile dropdown */}
      <select
        className="tabs-dropdown mobile-tabs"
        value={currentTab}
        onChange={handleSelectChange}
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

      <div className="footer">
        <p>© 2024 OpenVPN Gate Monitor v. {appVersion}</p>
      </div>
    </div>
  );
}

export default Settings;
