import React from "react";
import { Outlet } from "react-router-dom";
import ServerList from "../components/ServerList";
import "../css/ServersWithDetails.css";

export function ServersWithDetails() {
  return (
    <div className="servers-with-details-container">
      <div className="server-list-panel">
        <div className="header-bar">
          <button className="btn primary">+ Add Server</button>
          <button className="btn secondary">⟳ Refresh</button>
        </div>
        <h3>VPN Servers:</h3>
        <ServerList />
      </div>

      <div className="server-details-panel">
        <Outlet />
      </div>
    </div>
  );
}
export default ServersWithDetails;