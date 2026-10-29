import type { UserSessionDto } from "./adminSessionsApi";

/** Sessions refreshed within this window are shown as Active (not Idle). */
export const SESSION_ACTIVE_WITHIN_MS = 2 * 60 * 60 * 1000;

export type SessionActivityStatus = "current" | "active" | "idle";

export function formatSessionDeviceLabel(session: UserSessionDto): string {
  const ua = session.userAgent?.trim();
  if (ua) return formatUserAgent(ua);
  if (session.deviceId?.trim()) return `Device ${shortId(session.deviceId)}`;
  return session.id != null ? `Session #${session.id}` : "Unknown session";
}

export function formatUserAgent(userAgent: string): string {
  const ua = userAgent.trim();
  if (!ua) return "Unknown device";

  if (/^DataGateWin\b/i.test(ua)) return "DataGate for Windows";
  if (/^DataGateMac\b/i.test(ua)) return "DataGate for Mac";
  if (/^DataGateAndroid\b/i.test(ua)) return "DataGate for Android";
  if (/^DataGateiOS\b/i.test(ua)) return "DataGate for iOS";

  const browser =
    matchVersion(ua, /Edg\/([\d.]+)/i, "Edge") ??
    matchVersion(ua, /OPR\/([\d.]+)/i, "Opera") ??
    matchVersion(ua, /Firefox\/([\d.]+)/i, "Firefox") ??
    matchVersion(ua, /Chrome\/([\d.]+)/i, "Chrome") ??
    matchVersion(ua, /Version\/([\d.]+).*Safari/i, "Safari") ??
    (ua.length > 48 ? `${ua.slice(0, 45)}…` : ua);

  const os =
    /\bAndroid\b/i.test(ua)
      ? "Android"
      : /\biPhone|iPad|iPod\b/i.test(ua)
        ? "iOS"
        : /\bWindows NT\b/i.test(ua)
          ? "Windows"
          : /\bMac OS X\b/i.test(ua)
            ? "macOS"
            : /\bLinux\b/i.test(ua)
              ? "Linux"
              : null;

  return os ? `${browser} on ${os}` : browser;
}

export function getSessionActivityStatus(
  session: UserSessionDto,
  now = Date.now(),
): SessionActivityStatus {
  if (session.isCurrent) return "current";
  const lastActiveMs = sessionLastActiveMs(session);
  if (lastActiveMs != null && now - lastActiveMs <= SESSION_ACTIVE_WITHIN_MS) return "active";
  return "idle";
}

export function sessionLastActiveMs(session: UserSessionDto): number | null {
  if (!session.createdAt) return null;
  const ms = Date.parse(session.createdAt);
  return Number.isFinite(ms) ? ms : null;
}

export function formatRelativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";

  const deltaSec = Math.round((ms - now) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (abs < 60) return rtf.format(deltaSec, "second");
  const deltaMin = Math.round(deltaSec / 60);
  if (Math.abs(deltaMin) < 60) return rtf.format(deltaMin, "minute");
  const deltaHour = Math.round(deltaMin / 60);
  if (Math.abs(deltaHour) < 48) return rtf.format(deltaHour, "hour");
  const deltaDay = Math.round(deltaHour / 24);
  if (Math.abs(deltaDay) < 60) return rtf.format(deltaDay, "day");
  return new Date(ms).toLocaleString();
}

function matchVersion(ua: string, re: RegExp, name: string): string | null {
  const m = ua.match(re);
  if (!m) return null;
  const major = m[1]?.split(".")[0];
  return major ? `${name} ${major}` : name;
}

function shortId(id: string): string {
  const t = id.trim();
  return t.length > 12 ? `${t.slice(0, 8)}…` : t;
}
