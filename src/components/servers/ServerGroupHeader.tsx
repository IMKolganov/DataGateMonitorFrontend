import React, { useEffect, useRef, useState } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaEllipsisV,
  FaFolder,
  FaPen,
  FaPlus,
  FaTrash,
  FaUser,
} from "react-icons/fa";

type Props = {
  name: string;
  count: number;
  connectedCount?: number;
  collapsed: boolean;
  canManage?: boolean;
  onToggleCollapse: () => void;
  onStartRename?: () => void;
  onCommitRename?: (name: string) => void;
  onCancelRename?: () => void;
  onAddServers?: () => void;
  onDelete?: () => void;
  renaming?: boolean;
  dragHandle?: React.ReactNode;
};

export const ServerGroupHeader: React.FC<Props> = ({
  name,
  count,
  connectedCount = 0,
  collapsed,
  canManage = false,
  onToggleCollapse,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onAddServers,
  onDelete,
  renaming = false,
  dragHandle,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const showMenu = canManage && (onStartRename || onAddServers || onDelete);

  useEffect(() => {
    setDraftName(name);
  }, [name, renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const commitRename = () => {
    const next = draftName.trim();
    if (!next || next === name) {
      onCancelRename?.();
      return;
    }
    onCommitRename?.(next);
  };

  return (
    <div className="server-group-header">
      {dragHandle}
      {renaming ? (
        <form
          className="server-group-header__rename"
          onSubmit={(e) => {
            e.preventDefault();
            commitRename();
          }}
        >
          <input
            className="input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={64}
            aria-label="Group name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDraftName(name);
                onCancelRename?.();
              }
            }}
          />
          <button type="submit" className="btn primary">
            Save
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setDraftName(name);
              onCancelRename?.();
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="server-group-header__main"
          aria-expanded={!collapsed}
          aria-label={`${name}, ${count} servers, ${connectedCount} online users`}
          onClick={onToggleCollapse}
        >
          <span className="server-group-header__collapse" aria-hidden>
            {collapsed
              ? FaChevronRight({ className: "icon" })
              : FaChevronDown({ className: "icon" })}
          </span>
          <span className="server-group-header__icon">{FaFolder({ className: "icon" })}</span>
          <span className="server-group-header__title">
            <span className="server-group-header__name">{name}</span>
            <span
              className="server-group-header__meta"
              title={`${count} servers, ${connectedCount} online users`}
            >
              ({count})
              <span className="server-group-header__online">
                {FaUser({ className: "icon" })}
                {connectedCount}
              </span>
            </span>
          </span>
        </button>
      )}

      {showMenu && !renaming && (
        <div className="server-group-header__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="server-group-header__menu-btn"
            aria-label={`Group actions for ${name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            {FaEllipsisV({ className: "icon" })}
          </button>
          {menuOpen && (
            <div className="server-group-menu" role="menu">
              {onAddServers && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onAddServers();
                  }}
                >
                  {FaPlus({ className: "icon" })} Add servers
                </button>
              )}
              {onStartRename && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setDraftName(name);
                    onStartRename();
                  }}
                >
                  {FaPen({ className: "icon" })} Rename
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  className="server-group-menu__danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  {FaTrash({ className: "icon" })} Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerGroupHeader;
