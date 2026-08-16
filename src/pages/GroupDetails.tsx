import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaArrowLeft, FaGripVertical, FaSave, FaTrash } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  useGetApiVpnServerGroupsGetAll,
  usePutApiVpnServerGroupsUpdateId,
  useDeleteApiVpnServerGroupsDeleteId,
  usePutApiVpnServerGroupsReorder,
  usePutApiVpnServerGroupsIdSetServers,
  usePutApiVpnServerGroupsUngroupedSetServers,
  getGetApiVpnServerGroupsGetAllQueryKey,
} from "../api/orval/vpn-server-groups/vpn-server-groups";
import { getApiV3OpenVpnServersGetAllWithStatus } from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import type { VpnServerGroupsDtoVpnServerGroupDto } from "../api/orval/model/vpnServerGroupsDtoVpnServerGroupDto";
import type { VpnServerWithStatusesV3Response } from "../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { UNGROUPED_GROUP_ID } from "../utils/serverGroups";
import "../css/GroupDetails.css";

type ServerRow = { id: number; name: string; sortOrder: number; groupId: number | null };

function SortableRow({
  id,
  label,
  disabled,
}: {
  id: string;
  label: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group-details-sortable-item">
      {!disabled && (
        <button
          type="button"
          className="group-details-drag-handle"
          title="Drag to reorder"
          aria-label={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          {FaGripVertical({ className: "icon" })}
        </button>
      )}
      <span className="group-details-sortable-label">{label}</span>
    </div>
  );
}

export function readGroupsPayload(data: unknown): VpnServerGroupsDtoVpnServerGroupDto[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw.groups)) return raw.groups as VpnServerGroupsDtoVpnServerGroupDto[];
  const nested = raw.data;
  if (nested && typeof nested === "object" && Array.isArray((nested as { groups?: unknown }).groups)) {
    return (nested as { groups: VpnServerGroupsDtoVpnServerGroupDto[] }).groups;
  }
  return [];
}

/** Ordered ungrouped server ids using persisted SortOrder from the servers list. */
export function buildUngroupedMemberIds(
  allServers: ServerRow[],
  groups: VpnServerGroupsDtoVpnServerGroupDto[],
): number[] {
  const assigned = new Set(groups.flatMap((g) => g.serverIds ?? []));
  return allServers
    .filter((s) => !assigned.has(s.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((s) => s.id);
}

const GroupDetails: React.FC = () => {
  const { groupId: groupIdParam = "" } = useParams<{ groupId: string }>();
  const isUngrouped = groupIdParam === UNGROUPED_GROUP_ID;
  const numericGroupId = isUngrouped ? null : Number.parseInt(groupIdParam, 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = isAdmin(getCurrentUser());

  const groupsQuery = useGetApiVpnServerGroupsGetAll();
  const groups = useMemo(() => readGroupsPayload(groupsQuery.data), [groupsQuery.data]);

  const serversQuery = useQuery({
    // Distinct from ServerList MappedServer cache (same REST, different shape).
    queryKey: ["v3", "open-vpn-servers", "with-status", "group-details"],
    queryFn: async () => {
      const resp = await getApiV3OpenVpnServersGetAllWithStatus();
      const payload = resp as VpnServerWithStatusesV3Response;
      return payload.vpnServerWithStatuses ?? [];
    },
  });

  const allServers: ServerRow[] = useMemo(() => {
    const list = serversQuery.data ?? [];
    return list.flatMap((item) => {
      const s = item.vpnServerResponses?.vpnServer;
      const id = s?.id;
      if (typeof id !== "number") return [];
      return [
        {
          id,
          name: s?.serverName?.trim() || `Server ${id}`,
          sortOrder: s?.sortOrder ?? 0,
          groupId: s?.groupId ?? null,
        },
      ];
    });
  }, [serversQuery.data]);

  const currentGroup = useMemo(
    () => (typeof numericGroupId === "number" ? groups.find((g) => g.id === numericGroupId) : undefined),
    [groups, numericGroupId],
  );

  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [groupOrderIds, setGroupOrderIds] = useState<number[]>([]);
  const [savingServers, setSavingServers] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);

  const membersDirtyRef = useRef(false);
  const groupsDirtyRef = useRef(false);
  const nameDirtyRef = useRef(false);
  const lastRouteKeyRef = useRef("");
  const pendingServerIdsRef = useRef<number[] | null>(null);
  const pendingGroupIdsRef = useRef<number[] | null>(null);
  const serversPersistChainRef = useRef<Promise<void>>(Promise.resolve());
  const groupsPersistChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (lastRouteKeyRef.current !== groupIdParam) {
      lastRouteKeyRef.current = groupIdParam;
      membersDirtyRef.current = false;
      groupsDirtyRef.current = false;
      nameDirtyRef.current = false;
      pendingServerIdsRef.current = null;
      pendingGroupIdsRef.current = null;
    }

    if (!membersDirtyRef.current) {
      if (isUngrouped) {
        if (!nameDirtyRef.current) setName("Ungrouped");
        setMemberIds(buildUngroupedMemberIds(allServers, groups));
      } else if (currentGroup) {
        if (!nameDirtyRef.current) setName(currentGroup.name ?? "");
        setMemberIds([...(currentGroup.serverIds ?? [])]);
      }
    } else if (!nameDirtyRef.current) {
      if (isUngrouped) setName("Ungrouped");
      else if (currentGroup) setName(currentGroup.name ?? "");
    }

    if (!groupsDirtyRef.current) {
      setGroupOrderIds(
        [...groups]
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0))
          .map((g) => g.id!)
          .filter((id): id is number => typeof id === "number"),
      );
    }
  }, [groupIdParam, isUngrouped, currentGroup, groups, allServers]);

  const nameById = useMemo(() => new Map(allServers.map((s) => [s.id, s.name])), [allServers]);
  const groupNameById = useMemo(
    () => new Map(groups.map((g) => [g.id!, g.name ?? `Group ${g.id}`])),
    [groups],
  );

  const availableServers = useMemo(() => {
    const inGroup = new Set(memberIds);
    return allServers.filter((s) => !inGroup.has(s.id));
  }, [allServers, memberIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
    await queryClient.invalidateQueries({ queryKey: ["v3", "open-vpn-servers", "with-status"] });
  };

  const updateMutation = usePutApiVpnServerGroupsUpdateId();
  const deleteMutation = useDeleteApiVpnServerGroupsDeleteId();
  const reorderMutation = usePutApiVpnServerGroupsReorder();
  const setServersMutation = usePutApiVpnServerGroupsIdSetServers();
  const setUngroupedMutation = usePutApiVpnServerGroupsUngroupedSetServers();

  const schedulePersistServerOrder = (ids: number[]) => {
    if (!canEdit) return;
    const routeKey = groupIdParam;
    pendingServerIdsRef.current = ids;
    setSavingServers(true);
    serversPersistChainRef.current = serversPersistChainRef.current
      .catch(() => undefined)
      .then(async () => {
        while (pendingServerIdsRef.current && lastRouteKeyRef.current === routeKey) {
          const nextIds = pendingServerIdsRef.current;
          pendingServerIdsRef.current = null;
          try {
            if (isUngrouped) {
              await setUngroupedMutation.mutateAsync({ data: { vpnServerIds: nextIds } });
            } else if (typeof numericGroupId === "number") {
              await setServersMutation.mutateAsync({
                id: numericGroupId,
                data: { vpnServerIds: nextIds },
              });
            }
            if (lastRouteKeyRef.current !== routeKey) return;
            if (pendingServerIdsRef.current) continue;
            membersDirtyRef.current = false;
            toast.success("Server order saved");
            await invalidate();
          } catch {
            if (lastRouteKeyRef.current === routeKey && !pendingServerIdsRef.current) {
              toast.error("Failed to save server order");
            }
          }
        }
        if (lastRouteKeyRef.current === routeKey) setSavingServers(false);
      });
  };

  const schedulePersistGroupOrder = (ids: number[]) => {
    if (!canEdit) return;
    const routeKey = groupIdParam;
    pendingGroupIdsRef.current = ids;
    setSavingGroups(true);
    groupsPersistChainRef.current = groupsPersistChainRef.current
      .catch(() => undefined)
      .then(async () => {
        while (pendingGroupIdsRef.current && lastRouteKeyRef.current === routeKey) {
          const nextIds = pendingGroupIdsRef.current;
          pendingGroupIdsRef.current = null;
          try {
            await reorderMutation.mutateAsync({
              data: {
                items: nextIds.map((groupId, sortOrder) => ({ groupId, sortOrder })),
              },
            });
            if (lastRouteKeyRef.current !== routeKey) return;
            if (pendingGroupIdsRef.current) continue;
            groupsDirtyRef.current = false;
            toast.success("Group order saved");
            await invalidate();
          } catch {
            if (lastRouteKeyRef.current === routeKey && !pendingGroupIdsRef.current) {
              toast.error("Failed to save group order");
            }
          }
        }
        if (lastRouteKeyRef.current === routeKey) setSavingGroups(false);
      });
  };

  const onServersDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !canEdit) return;
    setMemberIds((items) => {
      const oldIndex = items.findIndex((id) => String(id) === String(active.id));
      const newIndex = items.findIndex((id) => String(id) === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      membersDirtyRef.current = true;
      schedulePersistServerOrder(next);
      return next;
    });
  };

  const onGroupsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !canEdit) return;
    setGroupOrderIds((items) => {
      const oldIndex = items.findIndex((id) => `g-${id}` === String(active.id));
      const newIndex = items.findIndex((id) => `g-${id}` === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      groupsDirtyRef.current = true;
      schedulePersistGroupOrder(next);
      return next;
    });
  };

  const saveName = async () => {
    if (!canEdit || isUngrouped || typeof numericGroupId !== "number") return;
    try {
      await updateMutation.mutateAsync({ id: numericGroupId, data: { name: name.trim() } });
      nameDirtyRef.current = false;
      toast.success("Group renamed");
      await invalidate();
    } catch {
      toast.error("Failed to rename group");
    }
  };

  const addServer = (id: number) => {
    membersDirtyRef.current = true;
    setMemberIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      schedulePersistServerOrder(next);
      return next;
    });
  };

  const removeServer = (id: number) => {
    if (isUngrouped) return;
    membersDirtyRef.current = true;
    setMemberIds((prev) => {
      const next = prev.filter((x) => x !== id);
      schedulePersistServerOrder(next);
      return next;
    });
  };

  const deleteGroup = async () => {
    if (!canEdit || isUngrouped || typeof numericGroupId !== "number") return;
    if (!window.confirm("Delete this group? Servers will become ungrouped.")) return;
    try {
      await deleteMutation.mutateAsync({ id: numericGroupId });
      toast.success("Group deleted");
      await invalidate();
      navigate("/servers", { replace: true });
    } catch {
      toast.error("Failed to delete group");
    }
  };

  if (!isUngrouped && (!Number.isFinite(numericGroupId) || (!currentGroup && !groupsQuery.isLoading))) {
    return (
      <div className="group-details">
        <p>Group not found.</p>
        <button type="button" className="btn secondary" onClick={() => navigate("/servers")}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="group-details">
      <div className="group-details-top">
        <button type="button" className="btn secondary" onClick={() => navigate("/servers")}>
          <span className="icon">{FaArrowLeft({ className: "icon" })}</span>
          Back
        </button>
        {!isUngrouped && canEdit && (
          <button type="button" className="btn danger" onClick={() => void deleteGroup()}>
            <span className="icon">{FaTrash({ className: "icon" })}</span>
            Delete group
          </button>
        )}
      </div>

      <h2 className="group-details-title">{isUngrouped ? "Ungrouped" : name || "Group"}</h2>
      {canEdit && (
        <p className="group-details-hint">
          Drag the grip handle to reorder. Changes save automatically when you drop.
        </p>
      )}

      {!isUngrouped && canEdit && (
        <div className="group-details-rename">
          <label htmlFor="group-name">Name</label>
          <div className="group-details-rename-row">
            <input
              id="group-name"
              value={name}
              onChange={(e) => {
                nameDirtyRef.current = true;
                setName(e.target.value);
              }}
              maxLength={64}
            />
            <button type="button" className="btn primary" onClick={() => void saveName()}>
              <span className="icon">{FaSave({ className: "icon" })}</span>
              Rename
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <section className="group-details-section">
          <div className="group-details-section-head">
            <h3>Group order</h3>
            {savingGroups && <span className="group-details-saving">Saving…</span>}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onGroupsDragEnd}>
            <SortableContext
              items={groupOrderIds.map((id) => `g-${id}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="group-details-sortable-list">
                {groupOrderIds.map((id) => (
                  <li key={`g-${id}`}>
                    <SortableRow id={`g-${id}`} label={groupNameById.get(id) ?? `Group ${id}`} />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </section>
      )}

      <section className="group-details-section">
        <div className="group-details-section-head">
          <h3>Servers in this group</h3>
          {savingServers && <span className="group-details-saving">Saving…</span>}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onServersDragEnd}>
          <SortableContext items={memberIds.map(String)} strategy={verticalListSortingStrategy}>
            <ul className="group-details-sortable-list">
              {memberIds.map((id) => (
                <li key={id} className="group-details-server-row">
                  <SortableRow
                    id={String(id)}
                    label={nameById.get(id) ?? `Server ${id}`}
                    disabled={!canEdit}
                  />
                  {canEdit && !isUngrouped && (
                    <button type="button" className="btn secondary" onClick={() => removeServer(id)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {memberIds.length === 0 && <p className="group-details-empty">No servers in this group.</p>}
      </section>

      {canEdit && (
        <section className="group-details-section">
          <h3>{isUngrouped ? "Move servers here" : "Add servers"}</h3>
          {availableServers.length === 0 ? (
            <p className="group-details-empty">
              {isUngrouped ? "No grouped servers to move." : "All servers are already in this group."}
            </p>
          ) : (
            <ul className="group-details-available-list">
              {availableServers.map((s) => (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <button type="button" className="btn secondary" onClick={() => addServer(s.id)}>
                    {isUngrouped ? "Ungroup" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default GroupDetails;
