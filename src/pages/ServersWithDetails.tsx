import { useRef, useState } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { FaChevronRight, FaChartLine, FaServer, FaFolder } from "react-icons/fa";
import ServerList from "../components/servers/ServerList.tsx";
import ServersGrid from "../components/servers/ServersGrid.tsx";
import { useMediaQuery } from "react-responsive";
import "../css/ServersWithDetails.css";
import { Suspense } from "react";

type ServersHomeTab = "overview" | "all" | "groups";

const HOME_TAB_STORAGE_KEY = "datagate.serversHomeTab";

function loadHomeTab(): ServersHomeTab {
  try {
    const raw = localStorage.getItem(HOME_TAB_STORAGE_KEY);
    if (raw === "overview" || raw === "all" || raw === "groups") return raw;
  } catch {
    // ignore
  }
  return "all";
}

function saveHomeTab(tab: ServersHomeTab) {
  try {
    localStorage.setItem(HOME_TAB_STORAGE_KEY, tab);
  } catch {
    // ignore
  }
}

function ServersWithDetails() {
  const [collapsed, setCollapsed] = useState(false);
  const [homeTab, setHomeTab] = useState<ServersHomeTab>(() => loadHomeTab());
  const [hideMobileSwitcher, setHideMobileSwitcher] = useState(false);
  const lastMobileScrollTop = useRef(0);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();
  const serversIndexMatch = useMatch({ path: "/servers", end: true });
  const isServersIndexOnly = Boolean(serversIndexMatch);

  /** `/servers/123/...` — layout with ServerDetails (not `/servers/statistics/...` global user stats). */
  const isViewingDetails = /^\/servers\/\d+/.test(location.pathname);
  /** `/servers/groups/:groupId` — group edit / reorder panel. */
  const isViewingGroup = /^\/servers\/groups\//.test(location.pathname);
  /** `/servers/statistics/:externalId` — user statistics across all VPN servers. */
  const isGlobalStatisticsRoute = /^\/servers\/statistics\//.test(location.pathname);
  /** Service Control → Details (Status Stream Logs). */
  const isStatusStreamLogsRoute = location.pathname === "/servers/status-stream-logs";
  const isMobileFullScreenOutlet =
    isViewingDetails || isViewingGroup || isGlobalStatisticsRoute || isStatusStreamLogsRoute;

  const [layoutIsMobile, setLayoutIsMobile] = useState(isMobile);
  if (layoutIsMobile !== isMobile) {
    setLayoutIsMobile(isMobile);
    if (isMobile) setCollapsed(false);
  }

  const selectHomeTab = (tab: ServersHomeTab) => {
    setHomeTab(tab);
    saveHomeTab(tab);
    setHideMobileSwitcher(false);
    lastMobileScrollTop.current = 0;
  };

  const onHomePaneScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (!isMobile) return;
    const y = e.currentTarget.scrollTop;
    const prev = lastMobileScrollTop.current;
    const delta = y - prev;
    lastMobileScrollTop.current = y;

    if (y <= 8) {
      if (hideMobileSwitcher) setHideMobileSwitcher(false);
      return;
    }

    if (Math.abs(delta) < 10) return;

    if (delta > 0 && !hideMobileSwitcher) {
      setHideMobileSwitcher(true);
    } else if (delta < 0 && hideMobileSwitcher) {
      setHideMobileSwitcher(false);
    }
  };

  const homeTablist = (
    <div
      className={`servers-home-tabs${hideMobileSwitcher && isMobile ? " servers-home-tabs--hidden" : ""}`}
      role="tablist"
      aria-label="Servers page view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={homeTab === "all"}
        className={`servers-home-tabs__btn btn ${homeTab === "all" ? "primary" : "secondary"}`}
        onClick={() => selectHomeTab("all")}
      >
        <FaServer className="icon" aria-hidden />
        All servers
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={homeTab === "groups"}
        className={`servers-home-tabs__btn btn ${homeTab === "groups" ? "primary" : "secondary"}`}
        onClick={() => selectHomeTab("groups")}
      >
        <FaFolder className="icon" aria-hidden />
        Groups
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={homeTab === "overview"}
        className={`servers-home-tabs__btn btn ${homeTab === "overview" ? "primary" : "secondary"}`}
        onClick={() => selectHomeTab("overview")}
      >
        <FaChartLine className="icon" aria-hidden />
        Overview
      </button>
    </div>
  );

  const homeTabPanel = (
    <div
      className="servers-home-panel"
      role="tabpanel"
      onScroll={onHomePaneScroll}
    >
      {homeTab === "all" ? (
        <ServersGrid />
      ) : homeTab === "groups" ? (
        <ServerList />
      ) : (
        <Suspense fallback={<div className="center">Loading…</div>}>
          <Outlet />
        </Suspense>
      )}
    </div>
  );

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
        {homeTablist}
        {homeTabPanel}
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
