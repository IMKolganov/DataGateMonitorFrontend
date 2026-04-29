import { useState } from "react";
import { avatarBackgroundStyle, initialsFromLabel } from "../../utils/avatarVisual";
import "../../css/UserAvatar.css";

export interface UserAvatarProps {
  /** Profile image URL (Google, or future API `avatarUrl`). */
  src?: string | null;
  /** Used for initials, `alt`, and color seed when `src` is missing. */
  name?: string | null;
  /** Extra seed for background color (e.g. user id or external id). */
  colorSeed?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ src, name, colorSeed, size = 32, className }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = (name ?? "").trim() || "User";
  const initials = initialsFromLabel(label);
  const seed = `${colorSeed ?? ""}|${label}`;
  const showImg = Boolean(src && !imgFailed);
  const dim = `${size}px`;
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <span
      role="img"
      aria-label={label}
      className={`user-avatar ${className ?? ""}`.trim()}
      style={{ width: dim, height: dim, fontSize: `${fontSize}px`, ...avatarBackgroundStyle(seed) }}
      title={label}
    >
      {showImg ? (
        <img
          src={src!}
          alt=""
          className="user-avatar__img"
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="user-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
