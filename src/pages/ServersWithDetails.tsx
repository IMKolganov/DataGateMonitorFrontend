import { useEffect, useState } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import ServerList from "../components/servers/ServerList.tsx";
import { useMediaQuery } from "react-responsive";
import "../css/ServersWithDetails.css";
import { Suspense } from "react";

type MobileServersHomeTab = "list" | "overview";

function ServersWithDetails() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileHomeTab, setMobileHomeTab] = useState<MobileServersHomeTab>("list");
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();
  const serversIndexMatch = useMatch({ path: "/servers", end: true });
  const isServersIndexOnly = Boolean(serversIndexMatch);

  /** `/servers/123/...` — layout with ServerDetails (not `/servers/statistics/...` global user stats). */
  const isViewingDetails = /^\/servers\/\d+/.test(location.pathname);
  /** `/servers/statistics/:externalId` — user statistics across all VPN servers (must not sit under the server list on mobile). */
  const isGlobalStatisticsRoute = /^\/servers\/statistics\//.test(location.pathname);

  useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  if (isMobile && isViewingDetails) {
    return (
      <div className="server-details-panel-mobile">
        <Suspense fallback={<div className="center">Loading…</div>}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  if (isMobile && isGlobalStatisticsRoute) {
    return (
      <div className="server-details-panel-mobile servers-with-details-mobile-global-stats">
        <Suspense fallback={<div className="center">Loading…</div>}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  if (isMobile && isServersIndexOnly) {
    return (
      <div className="servers-with-details-root servers-with-details-root--mobile-home">
        <div className="servers-mobile-home-switcher" role="tablist" aria-label="Servers page view">
          <button
            type="button"
            role="tab"
            aria-selected={mobileHomeTab === "list"}
            className={`servers-mobile-home-switcher__btn btn ${mobileHomeTab === "list" ? "primary" : "secondary"}`}
            onClick={() => setMobileHomeTab("list")}
          >
            Servers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileHomeTab === "overview"}
            className={`servers-mobile-home-switcher__btn btn ${mobileHomeTab === "overview" ? "primary" : "secondary"}`}
            onClick={() => setMobileHomeTab("overview")}
          >
            Overview
          </button>
        </div>
        {mobileHomeTab === "list" ? (
          <div className="server-list-panel server-list-panel--mobile-fill">
            <ServerList />
          </div>
        ) : (
          <div className="server-details-panel-mobile servers-with-details-mobile-index-outlet">
            <Suspense fallback={<div className="center">Loading…</div>}>
              <Outlet />
            </Suspense>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="servers-with-details-root">
      <div
        className={`servers-with-details-container${isMobile ? " servers-with-details-container--mobile" : ""}`}
      >
        {!isMobile && (
          <div className="server-list-panel toggle-panel">
            <button type="button" className="btn secondary" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "➡" : "⬅"}
            </button>
          </div>
        )}

        <div className={`server-list-panel ${collapsed && !isMobile ? "collapsed" : ""}`}>
          {(!collapsed || isMobile) && <ServerList />}
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
