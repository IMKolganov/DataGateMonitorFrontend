import { useEffect, useState } from "react";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_EXPIRATION } from "../utils/const";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../utils/auth/accessTokenEvents";
import {
  ADMIN_IDLE_STATE_EVENT,
  ADMIN_IDLE_WARNING_CLEARED_EVENT,
  ADMIN_IDLE_WARNING_EVENT,
  type AdminIdleStateDetail,
  type AdminIdleWarningDetail,
} from "../utils/auth/adminIdleSessionEvents";
import { isAuthenticated } from "../utils/auth/authSelectors";
import { formatSessionDebugLine, type SessionDebugSnapshot } from "../utils/auth/sessionDebugInfo";
import { getTokenRemainingMs } from "../utils/auth/tokenExpiration";

const TICK_MS = 250;

function readJwtRemainingMs(): number | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  try {
    return getTokenRemainingMs(token);
  } catch {
    return null;
  }
}

function readRefreshExpiresAtMs(): number | null {
  const raw = localStorage.getItem(REFRESH_TOKEN_EXPIRATION);
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function buildSnapshot(
  idleLogoutAtMs: number | null,
  idleWarningActive: boolean,
): SessionDebugSnapshot {
  return {
    jwtRemainingMs: readJwtRemainingMs(),
    idleLogoutAtMs,
    refreshExpiresAtMs: readRefreshExpiresAtMs(),
    idleWarningActive,
  };
}

/** Live session countdowns for footer debug (JWT, admin idle, refresh). */
export function useSessionDebugLine(): string | null {
  const [idleLogoutAtMs, setIdleLogoutAtMs] = useState<number | null>(null);
  const [idleWarningActive, setIdleWarningActive] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated()) return;

    const onIdleState = (ev: Event) => {
      const detail = (ev as CustomEvent<AdminIdleStateDetail>).detail;
      setIdleLogoutAtMs(detail?.idleLogoutAtMs ?? null);
    };
    const onWarn = (ev: Event) => {
      const detail = (ev as CustomEvent<AdminIdleWarningDetail>).detail;
      if (detail?.logoutAtMs) {
        setIdleLogoutAtMs(detail.logoutAtMs);
        setIdleWarningActive(true);
      }
    };
    const onWarnClear = () => setIdleWarningActive(false);
    const onTokenRefresh = () => setNow(Date.now());

    window.addEventListener(ADMIN_IDLE_STATE_EVENT, onIdleState);
    window.addEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
    window.addEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onWarnClear);
    window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, onTokenRefresh);

    const tickId = window.setInterval(() => setNow(Date.now()), TICK_MS);

    return () => {
      window.removeEventListener(ADMIN_IDLE_STATE_EVENT, onIdleState);
      window.removeEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
      window.removeEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onWarnClear);
      window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, onTokenRefresh);
      window.clearInterval(tickId);
    };
  }, []);

  if (!isAuthenticated()) return null;

  return formatSessionDebugLine(buildSnapshot(idleLogoutAtMs, idleWarningActive), now);
}
