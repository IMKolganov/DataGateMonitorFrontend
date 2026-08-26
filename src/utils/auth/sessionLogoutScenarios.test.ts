/**
 * Living contract for every forced sign-out path in the dashboard.
 *
 * Scenario map (expected UX):
 * - Admin idle (15 min default): AdminIdleWarningModal 1 min before → idleTimeout
 * - JWT expired + refresh OK: silent refresh, no redirect
 * - JWT expired + refresh 401/403: refreshRejected redirect
 * - JWT expired + refresh 503/network: session kept, no redirect
 * - JWT refresh returns expired token: sessionExpired redirect
 * - API call without access token: missingToken redirect
 * - WebSocket URL without access token: missingToken redirect
 * - Protected route without token: Navigate ?reason=missingToken (App PrivateRoute)
 * - Voluntary Sign out: /login without reason
 * - SignalR hub negotiate: resolveHubAccessToken never calls logout
 * - Concurrent logout + API race: first redirect reason wins (idleTimeout over missingToken)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRATION,
  REFRESH_TOKEN_KEY,
} from "../const";
import {
  buildLoginRedirectUrl,
  logoutReasonMessage,
  type LogoutReason,
} from "./logoutReason";

const FORCED_LOGOUT_SCENARIOS: ReadonlyArray<{
  reason: LogoutReason;
  messagePattern: RegExp;
  loginPath: string;
}> = [
  {
    reason: "idleTimeout",
    messagePattern: /inactivity/i,
    loginPath: "/login?reason=idleTimeout",
  },
  {
    reason: "sessionExpired",
    messagePattern: /session expired/i,
    loginPath: "/login?reason=sessionExpired",
  },
  {
    reason: "refreshRejected",
    messagePattern: /no longer valid/i,
    loginPath: "/login?reason=refreshRejected",
  },
  {
    reason: "missingToken",
    messagePattern: /no active session/i,
    loginPath: "/login?reason=missingToken",
  },
];

describe("Session logout scenario matrix", () => {
  describe("forced logout redirect contract", () => {
    it.each(FORCED_LOGOUT_SCENARIOS)(
      "$reason → login URL and user-facing message",
      ({ reason, messagePattern, loginPath }) => {
        expect(buildLoginRedirectUrl({ reason })).toBe(loginPath);
        expect(logoutReasonMessage(reason)).toMatch(messagePattern);
      },
    );

    it("voluntary sign-out has no reason query param", () => {
      expect(buildLoginRedirectUrl()).toBe("/login");
    });
  });

  describe("race: first redirect reason wins", () => {
    const assign = vi.fn();

    beforeEach(() => {
      localStorage.clear();
      assign.mockClear();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname: "/servers", search: "", assign },
      });
    });

    it("idleTimeout is kept when missingToken fires immediately after (API/SignalR race)", async () => {
      vi.resetModules();
      const { logout, resetLoginRedirectGuardForTests } = await import("../../api/apirequest");
      resetLoginRedirectGuardForTests();

      localStorage.setItem(ACCESS_TOKEN_KEY, "access");
      localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");

      logout("idleTimeout");
      logout("missingToken");

      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith("/login?reason=idleTimeout");
    });

    it("refreshRejected is kept when missingToken follows token clear", async () => {
      vi.resetModules();
      const { logout, resetLoginRedirectGuardForTests } = await import("../../api/apirequest");
      resetLoginRedirectGuardForTests();

      localStorage.setItem(ACCESS_TOKEN_KEY, "access");

      logout("refreshRejected");
      logout("missingToken");

      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith("/login?reason=refreshRejected");
    });
  });
});
