import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ServerList from "../components/ServerList";
import { useMediaQuery } from "react-responsive";
import "../css/ServersWithDetails.css";
import { appVersion } from "../version";

function ServersWithDetails() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();

  const isViewingDetails = /^\/servers\/\d+/.test(location.pathname);

  if (isMobile && isViewingDetails) {
    return (
      <div className="server-details-panel-mobile">
        <Outlet />
      </div>
    );
  }

  return (
    <div>
      <div className="servers-with-details-container">
        <div className="server-list-panel toggle-panel">
          <button className="btn secondary" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "➡" : "⬅"}
          </button>
        </div>

        <div className={`server-list-panel ${collapsed ? "collapsed" : ""}`}>
          {!collapsed && <ServerList />}
        </div>

        {!isMobile && (
          <div className="server-details-panel">
            <Outlet />
          </div>
        )}
      </div>

      <div className="footer">
        <p>© 2024 OpenVPN Gate Monitor v. {appVersion}</p>
      </div>
    </div>
  );
}

export default ServersWithDetails;
