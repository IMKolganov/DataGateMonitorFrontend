import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import ServerList from "../components/servers/ServerList.tsx";
import ServersGrid from "../components/servers/ServersGrid.tsx";
import { useMediaQuery } from "react-responsive";
import "../css/ServersWithDetails.css";
import { Suspense } from "react";

function ServersWithDetails() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();

  /** `/servers` exact — full-width grouped tile grid. */
  const isServersIndexOnly = /^\/servers\/?$/.test(location.pathname);
  /** `/servers/123/...` — layout with ServerDetails. */
  const isViewingDetails = /^\/servers\/\d+/.test(location.pathname);
  const isViewingGroup = /^\/servers\/groups\//.test(location.pathname);
  const isGlobalStatisticsRoute = /^\/servers\/statistics\//.test(location.pathname);
  const isStatusStreamLogsRoute = location.pathname === "/servers/status-stream-logs";
  const isMobileFullScreenOutlet =
    isViewingDetails || isViewingGroup || isGlobalStatisticsRoute || isStatusStreamLogsRoute;

  const [layoutIsMobile, setLayoutIsMobile] = useState(isMobile);
  if (layoutIsMobile !== isMobile) {
    setLayoutIsMobile(isMobile);
    if (isMobile) setCollapsed(false);
  }

  if (isMobile && isMobileFullScreenOutlet) {
    const extraClass = isGlobalStatisticsRoute ? " servers-with-details-mobile-global-stats" : "";
    return (
      <div className={`server-details-panel-mobile${extraClass}`}>
        <Suspense fallback={<div className="center">Loading…</div>}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  if (isServersIndexOnly) {
    return (
      <div
        className={`servers-with-details-root servers-with-details-root--home${
          isMobile ? " servers-with-details-root--mobile-home" : ""
        }`}
      >
        <div className="servers-home-panel">
          <ServersGrid />
        </div>
      </div>
    );
  }

  return (
    <div className="servers-with-details-root">
      <div
        className={`servers-with-details-container${isMobile ? " servers-with-details-container--mobile" : ""}`}
      >
        {!isMobile && collapsed && (
          <div className="server-list-panel toggle-panel">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setCollapsed(false)}
              title="Show server list"
              aria-label="Show server list"
            >
              <FaChevronRight className="icon" />
            </button>
          </div>
        )}

        <div className={`server-list-panel ${collapsed && !isMobile ? "collapsed" : ""}`}>
          {(!collapsed || isMobile) && (
            <ServerList onHideList={isMobile ? undefined : () => setCollapsed(true)} />
          )}
        </div>

        {!isMobile && (
          <div className="server-details-panel">
            <Suspense fallback={<div className="center">Loading…</div>}>
              <Outlet />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServersWithDetails;
