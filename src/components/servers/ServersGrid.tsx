import React, { useMemo, useState } from "react";
import {
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaFolderPlus,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-toastify";

import "../../css/ServerList.css";
import "../../css/ServersGrid.css";

import ServerItem from "./ServerItem";
import ServerGroupHeader from "./ServerGroupHeader";
import { AddServersToGroupModal } from "./AddServersToGroupModal";
import ServiceControls from "../ServiceControls";
import { PendingDiscoveriesBadgeButton } from "./PendingDiscoveriesBadgeButton";
import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";
import { isVpnServerDeleted } from "../../utils/serverListSearch";
import {
  useServersWithStatusList,
  serverRowIsDisabled,
  type MappedServer,
} from "../../hooks/useServersWithStatusList";
import {
  loadCollapsedGroups,
  saveCollapsedGroups,
  findGroupForServer,
  sumConnectedClients,
  DELETED_GROUP_ID,
  type CollapsedGroupsMap,
  type GroupAssignTarget,
  UNGROUPED_GROUP_ID,
} from "../../utils/serverGroups";
import { assignServersToGroup } from "../../utils/assignServerGroup";
import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "../../hooks/useCurrentUserConnectedServerIds";
import {
  usePostApiVpnServerGroupsCreate,
  usePutApiVpnServerGroupsUpdateId,
  useDeleteApiVpnServerGroupsDeleteId,
  getGetApiVpnServerGroupsGetAllQueryKey,
} from "../../api/orval/vpn-server-groups/vpn-server-groups";

const ServersGrid: React.FC = () => {
  const {
    canManage,
    servers,
    sections,
    visibleServerCount,
    groups,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    showDeleted,
    toggleShowDeleted,
    handleDelete,
    handleRefresh,
    invalidateServers,
    runServiceNow,
    hubConnectionState,
    hubLastError,
    normalizedServiceControlsData,
    queryClient,
  } = useServersWithStatusList();

  const { connectedServerIds } = useCurrentUserConnectedServerIds();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  const [collapsedMap, setCollapsedMap] = useState<CollapsedGroupsMap>(() => loadCollapsedGroups());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [addServersGroupId, setAddServersGroupId] = useState<number | null>(null);

  const createGroupMutation = usePostApiVpnServerGroupsCreate();
  const renameGroupMutation = usePutApiVpnServerGroupsUpdateId();
  const deleteGroupMutation = useDeleteApiVpnServerGroupsDeleteId();

  const addServersGroup = groups.find((g) => g.id === addServersGroupId);
  const addableServers = useMemo(() => {
    if (addServersGroupId == null) return [];
    const memberIds = new Set(addServersGroup?.serverIds ?? []);
    return servers
      .filter((s) => !memberIds.has(s.id) && !isVpnServerDeleted(s.raw))
      .map((s) => {
        const current = findGroupForServer(groups, s.id);
        return {
          id: s.id,
          name: s.raw.vpnServerResponses?.vpnServer?.serverName?.trim() || `Server ${s.id}`,
          currentGroupName: current?.name?.trim() || null,
        };
      });
  }, [addServersGroupId, addServersGroup?.serverIds, servers, groups]);

  const toggleCollapse = (key: string) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedGroups(next);
      return next;
    });
  };

  const expandAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = false;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const collapseAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = true;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const invalidateGroupsAndServers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() }),
      invalidateServers(),
    ]);
  };

  const saveNewGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const created = await createGroupMutation.mutateAsync({ data: { name } });
      const payload = created as { group?: { id?: number }; data?: { group?: { id?: number } } };
      const id = payload?.group?.id ?? payload?.data?.group?.id;
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
      toast.success("Group created");
      setCreatingGroup(false);
      setNewGroupName("");
      if (typeof id === "number") {
        setCollapsedMap((prev) => {
          const next = { ...prev, [String(id)]: false };
          saveCollapsedGroups(next);
          return next;
        });
      }
    } catch {
      toast.error("Failed to create group");
    }
  };

  const commitRenameGroup = async (id: number, name: string) => {
    try {
      await renameGroupMutation.mutateAsync({ id, data: { name } });
      toast.success("Group renamed");
      setRenamingKey(null);
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
    } catch {
      toast.error("Failed to rename group");
    }
  };

  const deleteGroup = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? Servers will become ungrouped.`)) return;
    try {
      await deleteGroupMutation.mutateAsync({ id });
      toast.success("Group deleted");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to delete group");
    }
  };

  const assignServer = async (serverId: number, target: GroupAssignTarget) => {
    try {
      await assignServersToGroup({
        target,
        groups,
        allServerIds: servers.map((s) => s.id),
        addServerIds: [serverId],
      });
      toast.success("Server group updated");
      await invalidateGroupsAndServers();
      setAddServersGroupId(null);
    } catch {
      toast.error("Failed to update server group");
    }
  };

  const renderTile = (server: MappedServer) => {
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
          isCurrentUserConnected={isUserConnectedToServer(connectedServerIds, server.id)}
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
  };

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
            {canManage && <PendingDiscoveriesBadgeButton />}
            {canManage && (
              <button
                className="btn secondary"
                onClick={() => {
                  setCreatingGroup(true);
                  setNewGroupName("");
                }}
                disabled={creatingGroup}
              >
                <span className="icon">{FaFolderPlus({ className: "icon" })}</span>
                Add Group
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
                {visibleServerCount} {visibleServerCount === 1 ? "server" : "servers"}
                {searchQuery.trim() ? " matched" : ""}
              </span>
              {sections.length > 0 && (
                <div className="server-groups-toolbar" role="group" aria-label="Group view controls">
                  <button
                    type="button"
                    className="server-groups-toolbar__btn"
                    onClick={expandAllGroups}
                    title="Expand all groups"
                    aria-label="Expand all groups"
                  >
                    {FaExpand({ className: "icon" })}
                  </button>
                  <button
                    type="button"
                    className="server-groups-toolbar__btn"
                    onClick={collapseAllGroups}
                    title="Collapse all groups"
                    aria-label="Collapse all groups"
                  >
                    {FaCompress({ className: "icon" })}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {creatingGroup && (
        <div className="server-group server-group--create">
          <form
            className="server-group-create"
            onSubmit={(e) => {
              e.preventDefault();
              void saveNewGroup();
            }}
          >
            <input
              className="input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              maxLength={64}
              placeholder="New group name"
              aria-label="New group name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setCreatingGroup(false);
                  setNewGroupName("");
                }
              }}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
            >
              Save
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setCreatingGroup(false);
                setNewGroupName("");
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

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
              </div>
            </li>
          ))}
        </ul>
      ) : sections.length === 0 && !creatingGroup ? (
        <p className="servers-grid-empty">
          {searchQuery.trim() ? "No servers match this search." : "No servers available."}
        </p>
      ) : (
        <div className="servers-grid-groups">
          {sections.map((section) => {
            const key = String(section.key);
            const collapsed = Boolean(collapsedMap[key]);
            const isNamed = typeof section.key === "number";
            const isDeletedSection = section.key === DELETED_GROUP_ID;
            const connectedCount = sumConnectedClients(section.servers);

            return (
              <section key={key} className="servers-grid-group">
                <ServerGroupHeader
                  name={section.name}
                  count={section.servers.length}
                  connectedCount={connectedCount}
                  collapsed={collapsed}
                  canManage={canManage && isNamed && !isDeletedSection}
                  renaming={renamingKey === key}
                  onToggleCollapse={() => toggleCollapse(key)}
                  onStartRename={isNamed ? () => setRenamingKey(key) : undefined}
                  onCommitRename={
                    isNamed
                      ? (name) => void commitRenameGroup(section.key as number, name)
                      : undefined
                  }
                  onCancelRename={() => setRenamingKey(null)}
                  onAddServers={
                    isNamed ? () => setAddServersGroupId(section.key as number) : undefined
                  }
                  onDelete={
                    isNamed
                      ? () => void deleteGroup(section.key as number, section.name)
                      : undefined
                  }
                />
                {!collapsed &&
                  (section.servers.length > 0 ? (
                    <ul className="servers-grid list">{section.servers.map(renderTile)}</ul>
                  ) : (
                    <p className="servers-grid-empty servers-grid-empty--group">
                      {searchQuery.trim()
                        ? "No servers match this search."
                        : section.key === UNGROUPED_GROUP_ID
                          ? "No ungrouped servers."
                          : "No servers in this group."}
                    </p>
                  ))}
              </section>
            );
          })}
        </div>
      )}

      <ServiceControls
        serviceData={normalizedServiceControlsData}
        onRunNow={runServiceNow}
        onOpenDetails={() => navigate("/servers/status-stream-logs")}
        hubConnectionState={hubConnectionState}
        hubLastError={hubLastError}
      />

      <AddServersToGroupModal
        isOpen={addServersGroupId != null}
        groupName={addServersGroup?.name?.trim() || "this group"}
        servers={addableServers}
        busy={false}
        onClose={() => setAddServersGroupId(null)}
        onAdd={(serverId) => {
          if (addServersGroupId == null) return;
          void assignServer(serverId, addServersGroupId);
        }}
      />
    </div>
  );
};

export default ServersGrid;
