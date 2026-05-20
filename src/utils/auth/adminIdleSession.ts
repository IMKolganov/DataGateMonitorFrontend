import { getApiAuthSessionPolicy, postApiAuthActivity } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { AuthSessionPolicyResponse } from "../../api/orvalModelShim";
import { logout } from "../../api/apirequest";
import { SystemRoles } from "../../constants/systemRoles";
import { ACCESS_TOKEN_KEY } from "../const";
import { decodeToken } from "./jwt";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function readAdminIdleTimeoutMinutes(token: string): number | null {
  try {
    const decoded = decodeToken(token);
    const role = (decoded[ROLE_CLAIM] as string | undefined) ?? decoded.role;
    if (role !== SystemRoles.Admin) return null;

    const raw = decoded.adminIdleTimeoutMinutes;
    if (typeof raw === "number" && raw > 0) return raw;
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    return 15;
  } catch {
    return null;
  }
}

async function fetchSessionPolicyMinutes(): Promise<number> {
  try {
    const policy = orvalPayload<AuthSessionPolicyResponse>(await getApiAuthSessionPolicy());
    const minutes = policy.adminIdleTimeoutMinutes;
    if (typeof minutes === "number" && minutes > 0) return minutes;
  } catch {
    // fall through
  }
  return 15;
}

/**
 * Logs out administrators after a period without user interaction.
 * Backend enforces the same idle window on token refresh.
 */
export function startAdminIdleSession(): () => void {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return () => {};

  let timeoutMinutes = readAdminIdleTimeoutMinutes(token);
  if (timeoutMinutes === null) return () => {};

  let idleTimer: number | null = null;
  let lastHeartbeatAt = 0;
  let stopped = false;

  const scheduleIdleLogout = () => {
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      logout();
    }, timeoutMinutes! * 60_000);
  };

  const onActivity = () => {
    if (stopped) return;
    scheduleIdleLogout();

    const now = Date.now();
    if (now - lastHeartbeatAt < HEARTBEAT_MIN_INTERVAL_MS) return;
    lastHeartbeatAt = now;

    void postApiAuthActivity().catch(() => {
      // ignore transient errors; refresh path will enforce idle on backend
    });
  };

  for (const eventName of ACTIVITY_EVENTS) {
    window.addEventListener(eventName, onActivity, { passive: true });
  }

  scheduleIdleLogout();

  void fetchSessionPolicyMinutes().then((minutes) => {
    if (stopped) return;
    timeoutMinutes = minutes;
    scheduleIdleLogout();
  });

  return () => {
    stopped = true;
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    for (const eventName of ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, onActivity);
    }
  };
}
