import React from "react";
import { FaChevronDown, FaChevronRight, FaFolder } from "react-icons/fa";

type Props = {
  name: string;
  count: number;
  collapsed: boolean;
  selected?: boolean;
  onToggleCollapse: () => void;
  onOpen: () => void;
};

export const ServerGroupHeader: React.FC<Props> = ({
  name,
  count,
  collapsed,
  selected,
  onToggleCollapse,
  onOpen,
}) => {
  return (
    <div className={`server-group-header${selected ? " selected" : ""}`}>
      <button
        type="button"
        className="server-group-header__collapse"
        aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        {collapsed
          ? FaChevronRight({ className: "icon" })
          : FaChevronDown({ className: "icon" })}
      </button>
      <button type="button" className="server-group-header__main" onClick={onOpen}>
        <span className="server-group-header__icon">{FaFolder({ className: "icon" })}</span>
        <span className="server-group-header__name">{name}</span>
        <span className="server-group-header__count">{count}</span>
      </button>
    </div>
  );
};

export default ServerGroupHeader;
