import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import "../../css/Table.css";
import "../../css/buttons.css";

export type RowActionVariant = "secondary" | "danger";

type RowActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
  variant?: RowActionVariant;
  title: string;
  icon: ReactNode;
};

/** Icon-only grid action button (Quota plans style). */
export function RowActionButton({
  variant = "secondary",
  title,
  icon,
  type = "button",
  ...rest
}: RowActionButtonProps) {
  return (
    <button
      type={type}
      className={`btn ${variant}`}
      title={title}
      aria-label={title}
      {...rest}
    >
      {icon}
    </button>
  );
}

type RowActionLinkProps = Omit<LinkProps, "className" | "children"> & {
  title: string;
  icon: ReactNode;
};

/** Icon-only navigation styled like a secondary row action. */
export function RowActionLink({ title, icon, ...rest }: RowActionLinkProps) {
  return (
    <Link className="btn secondary" title={title} aria-label={title} {...rest}>
      {icon}
    </Link>
  );
}

type GridRowActionsProps = {
  children: ReactNode;
};

/** Flex wrapper for icon-only action buttons inside a grid cell. */
export function GridRowActions({ children }: GridRowActionsProps) {
  return <div className="action-container">{children}</div>;
}
