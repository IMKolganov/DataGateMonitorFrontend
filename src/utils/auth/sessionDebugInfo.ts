import { formatRemainingTime } from "./tokenExpiration";

export type SessionDebugSnapshot = {
  jwtRemainingMs: number | null;
  idleLogoutAtMs: number | null;
  refreshExpiresAtMs: number | null;
  idleWarningActive: boolean;
};

function formatRefreshRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes >= 24 * 60) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    return `${days}d ${hours}h`;
  }
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
  return formatRemainingTime(ms);
}

/** Compact footer line for local auth/session debugging. */
export function formatSessionDebugLine(snapshot: SessionDebugSnapshot, now = Date.now()): string {
  const parts: string[] = [];

  if (snapshot.jwtRemainingMs != null) {
    parts.push(`JWT ${formatRemainingTime(snapshot.jwtRemainingMs)}`);
  } else {
    parts.push("JWT —");
  }

  if (snapshot.idleLogoutAtMs != null) {
    const idleMs = snapshot.idleLogoutAtMs - now;
    const label = snapshot.idleWarningActive ? "Idle⚠" : "Idle";
    parts.push(`${label} ${formatRemainingTime(idleMs)}`);
  }

  if (snapshot.refreshExpiresAtMs != null) {
    parts.push(`Refresh ${formatRefreshRemaining(snapshot.refreshExpiresAtMs - now)}`);
  }

  return parts.join(" · ");
}
