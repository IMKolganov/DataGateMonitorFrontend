import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import {
  closestCenter,
  pointerWithin,
  useDndContext,
  useDroppable,
  type CollisionDetection,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaGripVertical } from "react-icons/fa";

export function groupDragId(groupId: number): string {
  return `g:${groupId}`;
}

export function groupDropId(groupKey: string): string {
  return `d:${groupKey}`;
}

export function serverDragId(groupKey: string, serverId: number): string {
  return `s:${groupKey}:${serverId}`;
}

export function parseGroupDragId(id: string): number | null {
  if (!id.startsWith("g:")) return null;
  const n = Number(id.slice(2));
  return Number.isFinite(n) ? n : null;
}

export function parseGroupDropId(id: string): string | null {
  if (!id.startsWith("d:")) return null;
  const key = id.slice(2);
  return key.length > 0 ? key : null;
}

export function parseServerDragId(id: string): { groupKey: string; serverId: number } | null {
  if (!id.startsWith("s:")) return null;
  const rest = id.slice(2);
  const split = rest.lastIndexOf(":");
  if (split <= 0) return null;
  const serverId = Number(rest.slice(split + 1));
  if (!Number.isFinite(serverId)) return null;
  return { groupKey: rest.slice(0, split), serverId };
}

export const serverListCollisionDetection: CollisionDetection = (args) => {
  const type = args.active.data.current?.type;
  if (type === "group") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === "group"),
    });
  }

  const pointer = pointerWithin(args);
  const overServer = pointer.filter((c) => c.data?.current?.type === "server");
  if (overServer.length > 0) return overServer;
  const overGroup = pointer.filter((c) => c.data?.current?.type === "group-drop");
  if (overGroup.length > 0) return overGroup;

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (c) => c.data.current?.type === "server" || c.data.current?.type === "group-drop",
    ),
  });
};

function useDroppingFromOtherGroup(groupKey: string): boolean {
  const { active } = useDndContext();
  return (
    active?.data.current?.type === "server" && active.data.current.groupKey !== groupKey
  );
}

function DragHandle({
  label,
  attributes,
  listeners,
}: {
  label: string;
  attributes: HTMLAttributes<HTMLElement>;
  listeners: DraggableSyntheticListeners;
}) {
  return (
    <button
      type="button"
      className="server-list-drag-handle"
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      {FaGripVertical({ className: "icon" })}
    </button>
  );
}

export function SortableGroupSection({
  id,
  dropId,
  groupKey,
  disabled,
  sortingDisabled,
  collapsed,
  children,
}: {
  id: string;
  dropId: string;
  groupKey: string;
  disabled?: boolean;
  sortingDisabled?: boolean;
  collapsed?: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: disabled || sortingDisabled,
      data: { type: "group" },
      animateLayoutChanges: () => false,
    });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: dropId,
    disabled,
    data: { type: "group-drop", groupKey },
  });
  const droppingFromOtherGroup = useDroppingFromOtherGroup(groupKey);

  const style: CSSProperties = {
    transform: sortingDisabled ? undefined : CSS.Transform.toString(transform),
    transition: sortingDisabled ? undefined : transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const className = [
    "server-group",
    collapsed ? "server-group--collapsed" : "",
    isDragging ? "is-dragging" : "",
    isOver && droppingFromOtherGroup ? "is-drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      className={className}
    >
      {children(
        disabled ? null : (
          <DragHandle label="Drag to reorder group" attributes={attributes} listeners={listeners} />
        ),
      )}
    </div>
  );
}

export function DroppableGroupSection({
  dropId,
  groupKey,
  disabled,
  collapsed,
  children,
}: {
  dropId: string;
  groupKey: string;
  disabled?: boolean;
  collapsed?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled,
    data: { type: "group-drop", groupKey },
  });
  const droppingFromOtherGroup = useDroppingFromOtherGroup(groupKey);
  const className = [
    "server-group",
    collapsed ? "server-group--collapsed" : "",
    isOver && droppingFromOtherGroup ? "is-drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

export function SortableServerRow({
  id,
  groupKey,
  disabled,
  sortingDisabled,
  className,
  onClick,
  children,
}: {
  id: string;
  groupKey: string;
  disabled?: boolean;
  sortingDisabled?: boolean;
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: disabled || sortingDisabled,
    data: { type: "server", groupKey },
    animateLayoutChanges: () => false,
  });
  const style: CSSProperties = {
    transform: sortingDisabled ? undefined : CSS.Transform.toString(transform),
    transition: sortingDisabled ? undefined : transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${className}${isDragging ? " is-dragging" : ""}`}
      onClick={() => {
        if (isDragging) return;
        onClick();
      }}
    >
      {!disabled && (
        <DragHandle label="Drag to reorder server" attributes={attributes} listeners={listeners} />
      )}
      <div className="server-item-sortable-body">{children}</div>
    </li>
  );
}
