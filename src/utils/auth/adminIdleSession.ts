import { getApiAuthSessionPolicy, postApiAuthActivity } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { AuthSessionPolicyResponse } from "../../api/orvalModelShim";
import { logout } from "../../api/apirequest";
import { SystemRoles } from "../../constants/systemRoles";
import { ACCESS_TOKEN_KEY } from "../const";
import { decodeToken } from "./jwt";
import {
  ADMIN_IDLE_POLICY_CHANGED_EVENT,
  notifyAdminIdleWarning,
  notifyAdminIdleWarningCleared,
} from "./adminIdleSessionEvents";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const HEARTBEAT_MIN_INTERVAL_MS = 30_000;
/** Show warning this long before idle logout. */
export const ADMIN_IDLE_WARNING_BEFORE_MS = 60_000;

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
 * Shows a warning in the last minute. Backend enforces the same idle window on token refresh.
 */
export function startAdminIdleSession(): () => void {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return () => {};

  let timeoutMinutes = readAdminIdleTimeoutMinutes(token);
  if (timeoutMinutes === null) return () => {};

  let idleTimer: number | null = null;
  let warningTimer: number | null = null;
  let lastHeartbeatAt = 0;
  let stopped = false;
  let warningVisible = false;

  const clearTimers = () => {
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    if (warningTimer !== null) window.clearTimeout(warningTimer);
    idleTimer = null;
    warningTimer = null;
  };

  const clearWarning = () => {
    if (!warningVisible) return;
    warningVisible = false;
    notifyAdminIdleWarningCleared();
  };

  const scheduleIdleLogout = () => {
    clearTimers();
    clearWarning();

    const timeoutMs = Math.max(1, timeoutMinutes!) * 60_000;
    const logoutAtMs = Date.now() + timeoutMs;
    const warningDelay = timeoutMs - ADMIN_IDLE_WARNING_BEFORE_MS;

    if (warningDelay <= 0) {
      warningVisible = true;
      notifyAdminIdleWarning({ logoutAtMs });
    } else {
      warningTimer = window.setTimeout(() => {
        warningVisible = true;
        notifyAdminIdleWarning({ logoutAtMs });
      }, warningDelay);
    }

    idleTimer = window.setTimeout(() => {
      clearWarning();
      logout();
    }, timeoutMs);
  };

  const staySignedIn = () => {
    if (stopped) return;
    lastHeartbeatAt = Date.now();
    scheduleIdleLogout();
    void postApiAuthActivity().catch(() => {
      // ignore transient errors; refresh path will enforce idle on backend
    });
  };

  const onActivity = () => {
    if (stopped) return;
    // Any real interaction extends the session and dismisses the warning.
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

  const onPolicyChanged = () => {
    if (stopped) return;
    void fetchSessionPolicyMinutes().then((minutes) => {
      if (stopped) return;
      timeoutMinutes = minutes;
      scheduleIdleLogout();
    });
  };

  window.addEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, onPolicyChanged);

  scheduleIdleLogout();

  void fetchSessionPolicyMinutes().then((minutes) => {
    if (stopped) return;
    timeoutMinutes = minutes;
    scheduleIdleLogout();
  });

  // Expose stay-signed-in for the modal (same tab).
  (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn = staySignedIn;

  return () => {
    stopped = true;
    clearTimers();
    clearWarning();
    delete (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
    window.removeEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, onPolicyChanged);
    for (const eventName of ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, onActivity);
    }
  };
}

export function requestStaySignedIn(): void {
  const fn = (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
  fn?.();
}
