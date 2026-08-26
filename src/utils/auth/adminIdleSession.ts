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
/** Ignore activity right after opening the modal (layout/scroll must not dismiss it). */
const IGNORE_ACTIVITY_AFTER_WARNING_MS = 400;

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
 *
 * Sleep/wake and background-tab timer coalescing can fire the warning and logout
 * timeouts in the same turn (no paint). Logout is delayed until the warning has
 * been on screen for {@link ADMIN_IDLE_WARNING_BEFORE_MS}.
 */
export function startAdminIdleSession(): () => void {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return () => {};

  let timeoutMinutes = readAdminIdleTimeoutMinutes(token);
  if (timeoutMinutes === null) return () => {};

  let idleTimer: number | null = null;
  let warningTimer: number | null = null;
  let lastHeartbeatAt = 0;
  let lastActivityAt = Date.now();
  let warningFirstShownAt: number | null = null;
  let ignoreActivityUntil = 0;
  let stopped = false;
  let warningVisible = false;

  const clearTimers = () => {
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    if (warningTimer !== null) window.clearTimeout(warningTimer);
    idleTimer = null;
    warningTimer = null;
  };

  const clearWarning = () => {
    warningFirstShownAt = null;
    if (!warningVisible) return;
    warningVisible = false;
    notifyAdminIdleWarningCleared();
  };

  const presentWarning = (logoutAtMs: number) => {
    warningVisible = true;
    if (warningFirstShownAt == null) warningFirstShownAt = Date.now();
    ignoreActivityUntil = Date.now() + IGNORE_ACTIVITY_AFTER_WARNING_MS;
    notifyAdminIdleWarning({ logoutAtMs });
  };

  const warningHoldRemainingMs = (): number => {
    if (warningFirstShownAt == null) return ADMIN_IDLE_WARNING_BEFORE_MS;
    return Math.max(0, warningFirstShownAt + ADMIN_IDLE_WARNING_BEFORE_MS - Date.now());
  };

  const performIdleLogout = () => {
    idleTimer = null;
    const holdMs = warningHoldRemainingMs();
    // Same-turn coalesced timers (sleep/wake): warning was just shown, Date.now() has not advanced.
    if (warningFirstShownAt == null || holdMs > 50) {
      const waitMs = warningFirstShownAt == null ? ADMIN_IDLE_WARNING_BEFORE_MS : holdMs;
      presentWarning(Date.now() + waitMs);
      idleTimer = window.setTimeout(performIdleLogout, waitMs);
      return;
    }
    clearWarning();
    logout("idleTimeout");
  };

  const armTimers = (resetActivity: boolean) => {
    if (resetActivity) {
      lastActivityAt = Date.now();
      clearWarning();
    }

    clearTimers();

    const timeoutMs = Math.max(1, timeoutMinutes!) * 60_000;
    const logoutAtMs = lastActivityAt + timeoutMs;
    const untilLogout = logoutAtMs - Date.now();
    const untilWarning = untilLogout - ADMIN_IDLE_WARNING_BEFORE_MS;

    if (untilWarning <= 0) {
      const waitMs =
        untilLogout > 50 ? untilLogout : warningHoldRemainingMs();
      const effectiveLogoutAt = Date.now() + waitMs;
      presentWarning(effectiveLogoutAt);
      idleTimer = window.setTimeout(performIdleLogout, waitMs);
      return;
    }

    warningTimer = window.setTimeout(() => {
      warningTimer = null;
      presentWarning(logoutAtMs);
    }, untilWarning);

    idleTimer = window.setTimeout(performIdleLogout, untilLogout);
  };

  const staySignedIn = () => {
    if (stopped) return;
    lastHeartbeatAt = Date.now();
    armTimers(true);
    void postApiAuthActivity().catch(() => {
      // ignore transient errors; refresh path will enforce idle on backend
    });
  };

  const onActivity = (event: Event) => {
    if (stopped) return;
    // Opening the modal can emit a layout scroll; that must not count as "stay signed in".
    if (event.type === "scroll" && Date.now() < ignoreActivityUntil) return;
    armTimers(true);

    const now = Date.now();
    if (now - lastHeartbeatAt < HEARTBEAT_MIN_INTERVAL_MS) return;
    lastHeartbeatAt = now;

    void postApiAuthActivity().catch(() => {
      // ignore transient errors; refresh path will enforce idle on backend
    });
  };

  const onResume = () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.hidden) return;
    armTimers(false);
  };

  for (const eventName of ACTIVITY_EVENTS) {
    window.addEventListener(eventName, onActivity, { passive: true });
  }

  const onPolicyChanged = () => {
    if (stopped) return;
    void fetchSessionPolicyMinutes().then((minutes) => {
      if (stopped) return;
      timeoutMinutes = minutes;
      armTimers(true);
    });
  };

  window.addEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, onPolicyChanged);
  document.addEventListener("visibilitychange", onResume);
  window.addEventListener("pageshow", onResume);

  armTimers(true);

  void fetchSessionPolicyMinutes().then((minutes) => {
    if (stopped) return;
    timeoutMinutes = minutes;
    armTimers(true);
  });

  // Expose stay-signed-in for the modal (same tab).
  (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn = staySignedIn;

  return () => {
    stopped = true;
    clearTimers();
    clearWarning();
    delete (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
    window.removeEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, onPolicyChanged);
    document.removeEventListener("visibilitychange", onResume);
    window.removeEventListener("pageshow", onResume);
    for (const eventName of ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, onActivity);
    }
  };
}

export function requestStaySignedIn(): void {
  const fn = (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
  fn?.();
}
