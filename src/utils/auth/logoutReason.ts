export const LOGOUT_REASON_PARAM = "reason";

export type LogoutReason =
  | "sessionExpired"
  | "refreshRejected"
  | "missingToken"
  | "idleTimeout";

const LOGOUT_REASONS: ReadonlySet<string> = new Set<LogoutReason>([
  "sessionExpired",
  "refreshRejected",
  "missingToken",
  "idleTimeout",
]);

export function isLogoutReason(value: string | null | undefined): value is LogoutReason {
  return value != null && LOGOUT_REASONS.has(value);
}

export function readLogoutReasonFromSearch(search: string): LogoutReason | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get(LOGOUT_REASON_PARAM);
  return isLogoutReason(raw) ? raw : null;
}

export function logoutReasonMessage(reason: LogoutReason): string {
  switch (reason) {
    case "sessionExpired":
      return "Your session expired. Please sign in again to continue.";
    case "refreshRejected":
      return "Your session is no longer valid (it may have been revoked or timed out on the server). Please sign in again.";
    case "missingToken":
      return "You were redirected to sign in because no active session was found in this browser.";
    case "idleTimeout":
      return "You were signed out due to inactivity. Please sign in again to continue.";
  }
}

export function buildLoginRedirectUrl(options?: {
  returnPath?: string;
  reason?: LogoutReason;
}): string {
  const params = new URLSearchParams();
  const returnPath = options?.returnPath;

  if (returnPath?.startsWith("/tv/link")) {
    params.set("redirect", returnPath);
  }

  if (options?.reason) {
    params.set(LOGOUT_REASON_PARAM, options.reason);
  }

  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}
