import React from "react";
import { FaPlus, FaSyncAlt, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";

import "../../css/ServerList.css";
import "../../css/ServersGrid.css";

import ServerItem from "./ServerItem";
import ServiceControls from "../ServiceControls";
import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";
import { isVpnServerDeleted } from "../../utils/serverListSearch";
import {
  useServersWithStatusList,
  serverRowIsDisabled,
} from "../../hooks/useServersWithStatusList";
import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "../../hooks/useCurrentUserConnectedServerIds";

const ServersGrid: React.FC = () => {
  const {
    canManage,
    visibleServers,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    showDeleted,
    toggleShowDeleted,
    handleDelete,
    handleRefresh,
    runServiceNow,
    hubConnectionState,
    hubLastError,
    normalizedServiceControlsData,
  } = useServersWithStatusList();

  const { connectedServerIds } = useCurrentUserConnectedServerIds();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  return (
    <div className="servers-grid-root">
      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            {canManage && (
              <button className="btn primary" onClick={() => navigate("/servers/add")}>
                <span className="icon">{FaPlus({ className: "icon" })}</span>
                Add Server
              </button>
            )}
            <button
              className="btn secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <span className={`icon ${refreshing ? "icon-spin" : ""}`}>
                {FaSyncAlt({ className: `icon ${refreshing ? "icon-spin" : ""}` })}
              </span>
              Refresh
            </button>
            {canManage && (
              <button
                type="button"
                className={`btn secondary${showDeleted ? " is-active" : ""}`}
                onClick={toggleShowDeleted}
                aria-pressed={showDeleted}
                title={showDeleted ? "Hide deleted servers" : "Show deleted servers"}
              >
                <span className="icon">{FaTrash({ className: "icon" })}</span>
                {showDeleted ? "Hide deleted" : "Show deleted"}
              </button>
            )}
          </div>

          <div className="server-list-search">
            <label className="server-list-search__label" htmlFor="servers-grid-search">
              Search
            </label>
            <input
              id="servers-grid-search"
              className="input server-list-search__input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, API URL, or name"
              aria-label="Search servers by IP, API URL, or name"
            />
          </div>

          {!loading && (
            <div className="header-bar__meta">
              <span className="server-list-count">
                {visibleServers.length}{" "}
                {visibleServers.length === 1 ? "server" : "servers"}
                {searchQuery.trim() ? " matched" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <ul className="servers-grid list">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i} className="server-item server-item-skeleton">
              <div className="server-item-content">
                <div className="server-header">
                  <div className="server-info">
                    <span className="skeleton skeleton--w220-h20" />
                  </div>
                  <span className="skeleton skeleton--w70-h22" />
                </div>
                <div className="server-details">
                  <div className="detail-row">
                    <span className="skeleton skeleton--w14-h14" />
                    <span className="skeleton skeleton--w140-h14" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : visibleServers.length === 0 ? (
        <p className="servers-grid-empty">
          {searchQuery.trim() ? "No servers match this search." : "No servers available."}
        </p>
      ) : (
        <ul className="servers-grid list">
          {visibleServers.map((server) => {
            const deleted = isVpnServerDeleted(server.raw);
            return (
              <li
                key={server.id}
                className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}${
                  serverRowIsDisabled(server.raw) ? " server-item--polling-off" : ""
                }${deleted ? " server-item--deleted" : ""}`}
                onClick={() =>
                  navigate(buildServerSwitchPath(server.id, location.pathname, canManage))
                }
              >
                <ServerItem
                  server={server.raw}
                  vpnServerId={server.vpnServerId}
                  serviceStatus={server.serviceStatus}
                  errorMessage={server.errorMessage}
                  nextRunTime={server.nextRunTime}
                  wsOnline={server.wsOnline}
                  wsCountConnectedClients={server.wsCountConnectedClients}
                  wsCountSessions={server.wsCountSessions}
                  isCurrentUserConnected={isUserConnectedToServer(
                    connectedServerIds,
                    server.id,
                  )}
                  onView={(id) => {
                    const target = buildServerSwitchPath(id, location.pathname, canManage);
                    if (isMobile) navigate(target);
                    else navigate(target, { replace: true });
                  }}
                  onEdit={(id) => navigate(`/servers/edit/${id}`)}
                  onDelete={handleDelete}
                />
              </li>
            );
          })}
        </ul>
      )}

      <ServiceControls
        serviceData={normalizedServiceControlsData}
        onRunNow={runServiceNow}
        onOpenDetails={() => navigate("/servers/status-stream-logs")}
        hubConnectionState={hubConnectionState}
        hubLastError={hubLastError}
      />
    </div>
  );
};

export default ServersGrid;
