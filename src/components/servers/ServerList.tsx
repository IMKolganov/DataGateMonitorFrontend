// src/components/ServerList.tsx
import React, { useMemo, useState } from "react";
import {
  FaSyncAlt,
  FaPlus,
  FaFolderPlus,
  FaFolder,
  FaExpand,
  FaCompress,
  FaChevronLeft,
  FaList,
  FaThList,
  FaTrash,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-toastify";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import "../../css/ServerList.css";

import ServerItem from "./ServerItem";
import ServerGroupHeader from "./ServerGroupHeader";
import { AddServersToGroupModal } from "./AddServersToGroupModal";
import { PendingDiscoveriesBadgeButton } from "./PendingDiscoveriesBadgeButton";
import {
  DroppableGroupSection,
  SortableGroupSection,
  SortableServerRow,
  groupDragId,
  groupDropId,
  parseGroupDragId,
  parseGroupDropId,
  parseServerDragId,
  serverDragId,
  serverListCollisionDetection,
} from "./ServerListSortable";
import ServiceControls from "../ServiceControls";

import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";
import {
  loadCollapsedGroups,
  saveCollapsedGroups,
  loadServerDetailsHidden,
  saveServerDetailsHidden,
  loadGroupAssignVisible,
  saveGroupAssignVisible,
  findGroupForServer,
  sumConnectedClients,
  DELETED_GROUP_ID,
  UNGROUPED_GROUP_ID,
  type CollapsedGroupsMap,
  type GroupAssignTarget,
} from "../../utils/serverGroups";
import { assignServersToGroup } from "../../utils/assignServerGroup";
import { isVpnServerDeleted } from "../../utils/serverListSearch";
import {
  useServersWithStatusList,
  serverRowIsDisabled,
  type MappedServer,
} from "../../hooks/useServersWithStatusList";
import {
  usePostApiVpnServerGroupsCreate,
  usePutApiVpnServerGroupsUpdateId,
  useDeleteApiVpnServerGroupsDeleteId,
  putApiVpnServerGroupsReorder,
  putApiVpnServerGroupsIdSetServers,
  putApiVpnServerGroupsUngroupedSetServers,
  getGetApiVpnServerGroupsGetAllQueryKey,
} from "../../api/orval/vpn-server-groups/vpn-server-groups";
import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "../../hooks/useCurrentUserConnectedServerIds";

type ServerListProps = {
  onHideList?: () => void;
  /** Hide Service Controls (e.g. when another tab already shows them). */
  hideServiceControls?: boolean;
};

const ServerList: React.FC<ServerListProps> = ({ onHideList, hideServiceControls = false }) => {
  const {
    canManage: canAddServer,
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
  const [detailsHidden, setDetailsHidden] = useState(() => loadServerDetailsHidden());
  const [groupAssignVisible, setGroupAssignVisible] = useState(() => loadGroupAssignVisible());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [addServersGroupId, setAddServersGroupId] = useState<number | null>(null);

  const [activeDrag, setActiveDrag] = useState<{ type: "group" | "server"; name: string } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createGroupMutation = usePostApiVpnServerGroupsCreate();
  const renameGroupMutation = usePutApiVpnServerGroupsUpdateId();
  const deleteGroupMutation = useDeleteApiVpnServerGroupsDeleteId();

  const addServersGroup = groups.find((g) => g.id === addServersGroupId);
  const addableServers = useMemo(() => {
    if (addServersGroupId == null) return [];
    const memberIds = new Set(addServersGroup?.serverIds ?? []);
    return servers
      .filter((s) => !memberIds.has(s.id))
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

  const toggleDetailsHidden = () => {
    setDetailsHidden((prev) => {
      const next = !prev;
      saveServerDetailsHidden(next);
      return next;
    });
  };

  const toggleGroupAssignVisible = () => {
    setGroupAssignVisible((prev) => {
      const next = !prev;
      saveGroupAssignVisible(next);
      return next;
    });
  };

  const invalidateGroupsAndServers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() }),
      invalidateServers(),
    ]);
  };

  const addGroup = () => {
    setCreatingGroup(true);
    setNewGroupName("");
  };

  const cancelCreateGroup = () => {
    setCreatingGroup(false);
    setNewGroupName("");
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

  const assignServer = async (serverId: number, target: GroupAssignTarget, confirmMove = true) => {
    const from = findGroupForServer(groups, serverId);
    const serverName =
      servers.find((s) => s.id === serverId)?.raw.vpnServerResponses?.vpnServer?.serverName ??
      `Server ${serverId}`;
    if (confirmMove && from && typeof from.id === "number" && from.id !== target) {
      const targetLabel =
        target === UNGROUPED_GROUP_ID
          ? "Ungrouped"
          : groups.find((g) => g.id === target)?.name?.trim() || "this group";
      const ok = window.confirm(
        `"${serverName}" is in "${from.name?.trim() || `Group ${from.id}`}". Move it to ${targetLabel}?`,
      );
      if (!ok) return;
    }
    try {
      await assignServersToGroup({
        target,
        groups,
        allServerIds: servers.map((s) => s.id),
        addServerIds: [serverId],
      });
      toast.success("Server group updated");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to update server group");
    }
  };

  const persistGroupOrder = async (ids: number[]) => {
    try {
      await putApiVpnServerGroupsReorder({
        items: ids.map((groupId, sortOrder) => ({ groupId, sortOrder })),
      });
      toast.success("Group order saved");
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
    } catch {
      toast.error("Failed to save group order");
    }
  };

  const persistServerOrder = async (groupKey: string, ids: number[]) => {
    try {
      if (groupKey === DELETED_GROUP_ID) return;
      if (groupKey === UNGROUPED_GROUP_ID) {
        await putApiVpnServerGroupsUngroupedSetServers({ vpnServerIds: ids });
      } else {
        const id = Number(groupKey);
        if (!Number.isFinite(id)) return;
        await putApiVpnServerGroupsIdSetServers(id, { vpnServerIds: ids });
      }
      toast.success("Server order saved");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to save server order");
    }
  };

  const clearActiveDrag = () => setActiveDrag(null);

  const onListDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const groupId = parseGroupDragId(id);
    if (groupId != null) {
      const name = sections.find((s) => s.key === groupId)?.name ?? "Group";
      setActiveDrag({ type: "group", name });
      return;
    }
    const server = parseServerDragId(id);
    if (!server) return;
    const mapped = servers.find((s) => s.id === server.serverId);
    const name =
      mapped?.raw.vpnServerResponses?.vpnServer?.serverName?.trim() || `Server ${server.serverId}`;
    setActiveDrag({ type: "server", name });
  };

  const onListDragEnd = (event: DragEndEvent) => {
    clearActiveDrag();
    if (!canAddServer) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeGroup = parseGroupDragId(String(active.id));
    const overGroup = parseGroupDragId(String(over.id));
    if (activeGroup != null && overGroup != null) {
      const namedIds = sections.filter((s) => typeof s.key === "number").map((s) => s.key as number);
      const oldIndex = namedIds.indexOf(activeGroup);
      const newIndex = namedIds.indexOf(overGroup);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      void persistGroupOrder(arrayMove(namedIds, oldIndex, newIndex));
      return;
    }

    const activeServer = parseServerDragId(String(active.id));
    const overServer = parseServerDragId(String(over.id));
    if (activeServer && overServer && activeServer.groupKey === overServer.groupKey) {
      const section = sections.find((s) => String(s.key) === activeServer.groupKey);
      if (!section) return;
      const ids = section.servers.map((s) => s.id);
      const oldIndex = ids.indexOf(activeServer.serverId);
      const newIndex = ids.indexOf(overServer.serverId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      void persistServerOrder(activeServer.groupKey, arrayMove(ids, oldIndex, newIndex));
      return;
    }

    if (activeServer && overServer && activeServer.groupKey !== overServer.groupKey) {
      if (overServer.groupKey === DELETED_GROUP_ID || activeServer.groupKey === DELETED_GROUP_ID) {
        return;
      }
      const targetSection = sections.find((s) => String(s.key) === overServer.groupKey);
      if (!targetSection) return;
      const ids = targetSection.servers
        .map((s) => s.id)
        .filter((id) => id !== activeServer.serverId);
      const insertAt = Math.max(0, ids.indexOf(overServer.serverId));
      ids.splice(insertAt, 0, activeServer.serverId);
      void persistServerOrder(overServer.groupKey, ids);
      return;
    }

    const overDropKey = parseGroupDropId(String(over.id));
    if (
      activeServer &&
      overDropKey != null &&
      overDropKey !== activeServer.groupKey &&
      overDropKey !== DELETED_GROUP_ID &&
      activeServer.groupKey !== DELETED_GROUP_ID
    ) {
      void persistServerOrder(overDropKey, [
        ...(
          sections.find((s) => String(s.key) === overDropKey)?.servers.map((s) => s.id) ?? []
        ).filter((id) => id !== activeServer.serverId),
        activeServer.serverId,
      ]);
    }
  };

  const renderServer = (server: MappedServer, groupKey: string) => {
    const deleted = isVpnServerDeleted(server.raw) || groupKey === DELETED_GROUP_ID;
    return (
      <SortableServerRow
        key={server.id}
        id={serverDragId(groupKey, server.id)}
        groupKey={groupKey}
        disabled={!canAddServer || deleted}
        sortingDisabled={activeDrag?.type === "group" || deleted}
        className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}${
          serverRowIsDisabled(server.raw) ? " server-item--polling-off" : ""
        }${deleted ? " server-item--deleted" : ""}${detailsHidden ? " server-item--compact" : ""}`}
        onClick={() =>
          navigate(buildServerSwitchPath(server.id, location.pathname, canAddServer))
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
            const target = buildServerSwitchPath(id, location.pathname, canAddServer);
            if (isMobile) navigate(target);
            else navigate(target, { replace: true });
          }}
          onEdit={(id) => navigate(`/servers/edit/${id}`)}
          onDelete={handleDelete}
          groups={groups
            .filter((g): g is typeof g & { id: number } => typeof g.id === "number")
            .map((g) => ({ id: g.id, name: g.name?.trim() || `Group ${g.id}` }))}
          currentGroupId={findGroupForServer(groups, server.id)?.id ?? server.groupId ?? null}
          onAssignGroup={
            canAddServer && groupAssignVisible && !deleted
              ? (serverId, target) => {
                  void assignServer(serverId, target);
                }
              : undefined
          }
        />
      </SortableServerRow>
    );
  };

  return (
    <div>
      {onHideList && (
        <div className="server-list-hide-row">
          <button
            type="button"
            className="btn secondary server-list-hide-btn"
            onClick={onHideList}
            title="Hide server list"
            aria-label="Hide server list"
          >
            <span className="icon">{FaChevronLeft({ className: "icon" })}</span>
            Hide servers
          </button>
        </div>
      )}
      <div className="header-container">
        <div className="header-bar">
          <div className="left-buttons">
            {canAddServer && (
              <button className="btn primary" onClick={() => navigate("/servers/add")}>
                <span className="icon">{FaPlus({ className: "icon" })}</span>
                Add Server
              </button>
            )}

            {canAddServer && <PendingDiscoveriesBadgeButton />}

            {canAddServer && (
              <button className="btn secondary" onClick={addGroup} disabled={creatingGroup}>
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

            {canAddServer && (
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
            <label className="server-list-search__label" htmlFor="server-list-search-ip">
              Search
            </label>
            <input
              id="server-list-search-ip"
              className="input server-list-search__input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, API URL, or name"
              aria-label="Search servers by IP, API URL, or name"
            />
          </div>

          {!loading && (servers.length > 0 || sections.length > 0 || searchQuery.trim()) && (
            <div className="header-bar__meta">
              <span className="server-list-count">
                {visibleServerCount} {visibleServerCount === 1 ? "server" : "servers"}
                {searchQuery.trim() ? " matched" : ""}
              </span>
              <div className="server-groups-toolbar" role="group" aria-label="List view controls">
                {sections.length > 0 && (
                  <>
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
                  </>
                )}
                {canAddServer && (
                  <button
                    type="button"
                    className={`server-groups-toolbar__btn${groupAssignVisible ? " is-active" : ""}`}
                    onClick={toggleGroupAssignVisible}
                    title={
                      groupAssignVisible
                        ? "Hide group assignment on cards"
                        : "Show group assignment on cards"
                    }
                    aria-label={
                      groupAssignVisible
                        ? "Hide group assignment on cards"
                        : "Show group assignment on cards"
                    }
                    aria-pressed={groupAssignVisible}
                  >
                    {FaFolder({ className: "icon" })}
                  </button>
                )}
                <button
                  type="button"
                  className={`server-groups-toolbar__btn${detailsHidden ? " is-active" : ""}`}
                  onClick={toggleDetailsHidden}
                  title={
                    detailsHidden ? "Show server details" : "Compact list — names and status only"
                  }
                  aria-label={detailsHidden ? "Show server details" : "Hide server details"}
                  aria-pressed={detailsHidden}
                >
                  {detailsHidden ? FaThList({ className: "icon" }) : FaList({ className: "icon" })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <ul className="list">
          {[1, 2, 3, 4].map((i) => (
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
                  <div className="detail-row">
                    <span className="skeleton skeleton--w14-h14" />
                    <span className="skeleton skeleton--w180-h14" />
                  </div>
                  <div className="detail-row">
                    <span className="skeleton skeleton--w14-h14" />
                    <span className="skeleton skeleton--w100-h14" />
                  </div>
                </div>
                <div className="detail-row">
                  <span className="skeleton skeleton--w14-h14" />
                  <span className="skeleton skeleton--w80-h24" />
                </div>
                <div className="server-actions">
                  <div className="server-actions-buttons">
                    <span className="skeleton skeleton--w70-h32" />
                    <span className="skeleton skeleton--w65-h32" />
                    <span className="skeleton skeleton--w75-h32" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="server-groups">
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
                      cancelCreateGroup();
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
                <button type="button" className="btn secondary" onClick={cancelCreateGroup}>
                  Cancel
                </button>
              </form>
            </div>
          )}
          {canAddServer && (groups.length > 0 || servers.length > 1) && (
            <p className="server-groups-hint">
              Drag the grip to reorder groups and servers. Drop a server on another group to move
              it.
            </p>
          )}
          {sections.length > 0 || creatingGroup || (!searchQuery.trim() && groups.length > 0) ? (
            <DndContext
              sensors={sensors}
              collisionDetection={serverListCollisionDetection}
              onDragStart={onListDragStart}
              onDragCancel={clearActiveDrag}
              onDragEnd={onListDragEnd}
            >
              <SortableContext
                items={sections
                  .filter((s) => typeof s.key === "number")
                  .map((s) => groupDragId(s.key as number))}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => {
                  const key = String(section.key);
                  const collapsed = Boolean(collapsedMap[key]);
                  const isNamed = typeof section.key === "number";
                  const isDeletedSection = section.key === DELETED_GROUP_ID;
                  const serverIds = section.servers.map((s) => serverDragId(key, s.id));
                  const connectedCount = sumConnectedClients(section.servers);
                  const inner = (dragHandle?: React.ReactNode) => (
                    <>
                      <ServerGroupHeader
                        name={section.name}
                        count={section.servers.length}
                        connectedCount={connectedCount}
                        collapsed={collapsed}
                        canManage={canAddServer && isNamed}
                        renaming={renamingKey === key}
                        dragHandle={dragHandle}
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
                      {!collapsed && (
                        <SortableContext items={serverIds} strategy={verticalListSortingStrategy}>
                          <ul className="list server-group-list">
                            {section.servers.length > 0 ? (
                              section.servers.map((server) => renderServer(server, key))
                            ) : (
                              <li className="server-group-empty">
                                {searchQuery.trim()
                                  ? "No servers match this search."
                                  : "No servers in this group."}
                              </li>
                            )}
                          </ul>
                        </SortableContext>
                      )}
                    </>
                  );
                  if (!isNamed) {
                    return (
                      <DroppableGroupSection
                        key={key}
                        dropId={groupDropId(key)}
                        groupKey={key}
                        disabled={!canAddServer || isDeletedSection}
                        collapsed={collapsed}
                      >
                        {inner()}
                      </DroppableGroupSection>
                    );
                  }
                  return (
                    <SortableGroupSection
                      key={key}
                      id={groupDragId(section.key as number)}
                      dropId={groupDropId(key)}
                      groupKey={key}
                      disabled={!canAddServer}
                      sortingDisabled={activeDrag?.type === "server"}
                      collapsed={collapsed}
                    >
                      {(dragHandle) => inner(dragHandle)}
                    </SortableGroupSection>
                  );
                })}
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeDrag ? (
                  <div className={`server-drag-overlay server-drag-overlay--${activeDrag.type}`}>
                    {activeDrag.name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <p>
              {searchQuery.trim() ? "No servers match this search." : "No servers available."}
            </p>
          )}
        </div>
      )}

      {!hideServiceControls && (
        <ServiceControls
          serviceData={normalizedServiceControlsData}
          onRunNow={runServiceNow}
          onOpenDetails={() => navigate("/servers/status-stream-logs")}
          hubConnectionState={hubConnectionState}
          hubLastError={hubLastError}
        />
      )}

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

export default ServerList;
