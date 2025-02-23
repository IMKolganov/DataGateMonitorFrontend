import React from "react";
import { Link } from "react-router-dom";
import "../index.css";

export function Settings() {
  return (
    <div className="content-wrapper wide-table">
      <h2>Settings</h2>
      <ul className="settings-links">
        <li><Link to="/settings/applications">Application Settings</Link></li>
      </ul>
    </div>
  );
}

export default Settings;
