import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import ServerList from "../components/ServerList";
import "../css/ServersWithDetails.css";
import { appVersion } from '../version';

function ServersWithDetails() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
    <div className="servers-with-details-container">
      <div className="server-list-panel toggle-panel">
        <button
          className="btn secondary"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "➡" : "⬅"}
        </button>
      </div>

      <div className={`server-list-panel ${collapsed ? "collapsed" : ""}`}>
        {!collapsed && <ServerList />}
      </div>

      <div className="server-details-panel">
        <Outlet />
      </div>


      
    </div>

      <div className="footer">
        <p>© 2024 OpenVPN Gate Monitor v. {appVersion}</p>
      </div>
    </div>
  );
}

export default ServersWithDetails;
