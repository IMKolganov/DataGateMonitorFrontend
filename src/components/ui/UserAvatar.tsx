import { useEffect, useRef, useState, type CSSProperties } from "react";
import axios from "axios";
import { avatarBackgroundStyle, initialsFromLabel } from "../../utils/avatarVisual";
import { getApiBaseUrlResolved } from "../../api/apirequest";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import "../../css/UserAvatar.css";

export interface UserAvatarProps {
  /** Profile image URL (e.g. Google HTTPS). Rendered in `<img>` when set. */
  src?: string | null;
  /**
   * When no usable public `src`, fetch Telegram profile photo from the dashboard API with JWT
   * (plain `img src` cannot authenticate to this endpoint).
   */
  telegramPhotoTelegramId?: number | null;
  /** Used for initials, `alt`, and color seed when no image is shown. */
  name?: string | null;
  /** Extra seed for background color (e.g. user id or external id). */
  colorSeed?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({
  src,
  telegramPhotoTelegramId,
  name,
  colorSeed,
  size = 32,
  className,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [tgBlobUrl, setTgBlobUrl] = useState<string | null>(null);
  const [tgFetchFailed, setTgFetchFailed] = useState(false);
  const blobRef = useRef<string | null>(null);
  const [imageSourceKey, setImageSourceKey] = useState(
    () => `${src ?? ""}|${telegramPhotoTelegramId ?? ""}`,
  );

  const label = (name ?? "").trim() || "User";
  const initials = initialsFromLabel(label);
  const seed = `${colorSeed ?? ""}|${label}`;

  const publicHttpSrc =
    typeof src === "string" &&
    src.length > 0 &&
    (src.startsWith("http://") || src.startsWith("https://"))
      ? src
      : undefined;

  const nextImageSourceKey = `${src ?? ""}|${telegramPhotoTelegramId ?? ""}`;
  if (nextImageSourceKey !== imageSourceKey) {
    setImageSourceKey(nextImageSourceKey);
    setImgFailed(false);
    setTgFetchFailed(false);
  }

  useEffect(() => {
    const clearTelegramBlob = () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      queueMicrotask(() => setTgBlobUrl(null));
    };

    if (publicHttpSrc) {
      clearTelegramBlob();
      return;
    }

    const tid = telegramPhotoTelegramId;
    if (tid == null || !Number.isFinite(tid) || tid <= 0) {
      clearTelegramBlob();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const base = await getApiBaseUrlResolved();
        if (cancelled) return;
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
          if (!cancelled) setTgFetchFailed(true);
          return;
        }
        const url = `${base}/api/tgbot-users/profile-photo-file/${Math.trunc(tid)}`;
        const resp = await axios.get(url, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const contentTypeRaw =
          typeof resp.headers.get === "function"
            ? resp.headers.get("content-type")
            : resp.headers["content-type"];
        const contentType =
          typeof contentTypeRaw === "string"
            ? contentTypeRaw
            : Array.isArray(contentTypeRaw) && typeof contentTypeRaw[0] === "string"
              ? contentTypeRaw[0]
              : undefined;
        const mime = contentType?.split(";")[0]?.trim();
        const blob =
          mime && mime !== "application/octet-stream"
            ? new Blob([resp.data], { type: mime })
            : (resp.data as Blob);
        const objectUrl = URL.createObjectURL(blob);
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = objectUrl;
        setTgBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setTgFetchFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [publicHttpSrc, telegramPhotoTelegramId, src]);

  const effectiveImgSrc = publicHttpSrc ?? (tgBlobUrl && !tgFetchFailed ? tgBlobUrl : undefined);
  const showImg = Boolean(effectiveImgSrc && !imgFailed && !tgFetchFailed);
  const dim = `${size}px`;
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <span
      role="img"
      aria-label={label}
      className={`user-avatar ${className ?? ""}`.trim()}
      style={
        {
          "--avatar-size": dim,
          "--avatar-font-size": `${fontSize}px`,
          ...avatarBackgroundStyle(seed),
        } as CSSProperties
      }
      title={label}
    >
      {showImg ? (
        <img
          src={effectiveImgSrc!}
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
