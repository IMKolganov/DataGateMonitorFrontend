import React from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../css/Settings.css";
import { appVersion } from '../version';

export function Settings() {
  const navigate = useNavigate();

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

      <div className="tabs">
        <NavLink
          to="/settings/general"
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          General
        </NavLink>
        <NavLink
          to="/settings/applications"
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          API Clients
        </NavLink>
        <NavLink
          to="/settings/geolitedb"
          className={({ isActive }) => (isActive ? "tab active-tab" : "tab")}
        >
          GeoLite DB
        </NavLink>
      </div>

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