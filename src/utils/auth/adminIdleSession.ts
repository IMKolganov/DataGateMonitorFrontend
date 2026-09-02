import { getApiAuthSessionPolicy, postApiAuthActivity } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { AuthSessionPolicyResponse } from "../../api/orvalModelShim";
import { logout } from "../../api/apirequest";
import { SystemRoles } from "../../constants/systemRoles";
import { ACCESS_TOKEN_KEY } from "../const";
import { decodeToken } from "./jwt";
import {
  ADMIN_IDLE_API_ACTIVITY_EVENT,
  ADMIN_IDLE_POLICY_CHANGED_EVENT,
  notifyAdminIdleState,
  notifyAdminIdleWarning,
  notifyAdminIdleWarningCleared,
} from "./adminIdleSessionEvents";

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
/** Show warning this long before idle logout. */
export const ADMIN_IDLE_WARNING_BEFORE_MS = 60_000;

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
 * Logs out administrators after a period without authenticated API activity.
 * Shows a warning in the last minute. Backend enforces the same idle window on
 * token refresh (and Touches idle state on authenticated admin requests).
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
  let lastActivityAt = Date.now();
  let warningFirstShownAt: number | null = null;
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
      notifyAdminIdleState({ idleLogoutAtMs: effectiveLogoutAt });
      return;
    }

    warningTimer = window.setTimeout(() => {
      warningTimer = null;
      presentWarning(logoutAtMs);
    }, untilWarning);

    idleTimer = window.setTimeout(performIdleLogout, untilLogout);
    notifyAdminIdleState({ idleLogoutAtMs: logoutAtMs });
  };

  const staySignedIn = () => {
    if (stopped) return;
    armTimers(true);
    void postApiAuthActivity().catch(() => {
      // ignore transient errors; refresh path will enforce idle on backend
    });
  };

  const onApiActivity = () => {
    if (stopped) return;
    armTimers(true);
  };

  const onResume = () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.hidden) return;
    armTimers(false);
  };

  const onPolicyChanged = () => {
    if (stopped) return;
    void fetchSessionPolicyMinutes().then((minutes) => {
      if (stopped) return;
      timeoutMinutes = minutes;
      armTimers(true);
    });
  };

  window.addEventListener(ADMIN_IDLE_API_ACTIVITY_EVENT, onApiActivity);
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
    notifyAdminIdleState({ idleLogoutAtMs: null });
    delete (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
    window.removeEventListener(ADMIN_IDLE_API_ACTIVITY_EVENT, onApiActivity);
    window.removeEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, onPolicyChanged);
    document.removeEventListener("visibilitychange", onResume);
    window.removeEventListener("pageshow", onResume);
  };
}

export function requestStaySignedIn(): void {
  const fn = (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
  fn?.();
}
