import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../css/Settings.css";

export function Settings() {
  const navigate = useNavigate();
  return (
    <div className="content-wrapper wide-table settings">
      <h2>Settings</h2>
      <div className="header-container">
        <p className="settings-description">
          This page allows you to manage various aspects of the system. You can configure application settings and other parameters here.
        </p>
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate("/")}>
              <FaArrowLeft className="icon" /> Back
            </button>
          </div>
        </div>
      </div>
      <ul className="settings-links">
        <li>
          <Link to="/settings/applications">Application Settings</Link>
          <p className="settings-item-description">
            Manage registered applications, generate API tokens, and configure access permissions.
          </p>
        </li>
      </ul>
    </div>
  );
}

export default Settings;
