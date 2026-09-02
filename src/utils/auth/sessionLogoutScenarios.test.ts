/**
 * Living contract for forced sign-out and session keep-alive paths.
 *
 * Admin (dashboard):
 * - No authenticated API for idle window (default 15m): warning 1m before → idleTimeout
 * - Successful authenticated apiRequest resets local idle (notifyAdminApiActivity; see apirequest.test)
 * - Stay signed in → POST /api/auth/activity (adminIdleSession.test)
 * - JWT expiry + refresh OK / 401 / 503 / expired access: authSession.test + apirequest.test
 * - Backend RefreshAsync rejects when Admin idle expired (TokenServiceIdleAndRoleTests)
 * - Backend Touch on authenticated Admin requests (AdminIdleActivityMiddlewareTests)
 *
 * VpnUser / Google app client:
 * - startAdminIdleSession no-ops (covered below)
 * - RefreshAsync never checks idle (TokenServiceIdleAndRoleTests)
 * - Session = access JWT + refresh lifetime only
 *
 * Shared:
 * - missingToken / voluntary sign-out / SignalR no-logout / redirect race (below + signalRAccessToken.test)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../const";
import {
  buildLoginRedirectUrl,
  logoutReasonMessage,
  type LogoutReason,
} from "./logoutReason";
import { SystemRoles } from "../../constants/systemRoles";
import { notifyAdminApiActivity } from "./adminIdleSessionEvents";

const FORCED_LOGOUT_SCENARIOS: ReadonlyArray<{
  reason: LogoutReason;
  messagePattern: RegExp;
  loginPath: string;
  appliesTo: ReadonlyArray<"Admin" | "VpnUser" | "any">;
}> = [
  {
    reason: "idleTimeout",
    messagePattern: /inactivity/i,
    loginPath: "/login?reason=idleTimeout",
    appliesTo: ["Admin"],
  },
  {
    reason: "sessionExpired",
    messagePattern: /session expired/i,
    loginPath: "/login?reason=sessionExpired",
    appliesTo: ["any"],
  },
  {
    reason: "refreshRejected",
    messagePattern: /no longer valid/i,
    loginPath: "/login?reason=refreshRejected",
    appliesTo: ["any"],
  },
  {
    reason: "missingToken",
    messagePattern: /no active session/i,
    loginPath: "/login?reason=missingToken",
    appliesTo: ["any"],
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

    it("idleTimeout is an Admin-only forced path in the matrix", () => {
      const idle = FORCED_LOGOUT_SCENARIOS.find((s) => s.reason === "idleTimeout");
      expect(idle?.appliesTo).toEqual(["Admin"]);
    });

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

describe("Role session policy (Admin dashboard vs Google VpnUser client)", () => {
  const logout = vi.fn();
  const postActivity = vi.fn(async () => ({}));
  const getPolicy = vi.fn(async () => ({
    success: true,
    data: { adminIdleTimeoutMinutes: 15 },
  }));
  const decodeToken = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    logout.mockClear();
    postActivity.mockClear();
    getPolicy.mockReset();
    getPolicy.mockResolvedValue({
      success: true,
      data: { adminIdleTimeoutMinutes: 15 },
    });
    decodeToken.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: false });

    vi.doMock("../../api/apirequest", () => ({
      logout: (...args: unknown[]) => logout(...args),
    }));
    vi.doMock("../../api/orval/auth/auth", () => ({
      getApiAuthSessionPolicy: (...args: unknown[]) => getPolicy(...args),
      postApiAuthActivity: (...args: unknown[]) => postActivity(...args),
    }));
    vi.doMock("../../api/orvalPayload", () => ({
      orvalPayload: <T,>(value: { data?: T } | T): T =>
        value != null && typeof value === "object" && "data" in value
          ? ((value as { data: T }).data as T)
          : (value as T),
    }));
    vi.doMock("./jwt", () => ({
      decodeToken: (t: string) => decodeToken(t),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("../../api/apirequest");
    vi.doUnmock("../../api/orval/auth/auth");
    vi.doUnmock("../../api/orvalPayload");
    vi.doUnmock("./jwt");
    delete (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
  });

  async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it("Admin: idle warning then idleTimeout without API activity", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "admin-tok");
    decodeToken.mockReturnValue({
      role: SystemRoles.Admin,
      adminIdleTimeoutMinutes: 2,
    });
    getPolicy.mockResolvedValue({
      success: true,
      data: { adminIdleTimeoutMinutes: 2 },
    });

    const { startAdminIdleSession } = await import("./adminIdleSession");
    const stop = startAdminIdleSession();
    await flush();

    vi.advanceTimersByTime(60_000);
    expect(logout).not.toHaveBeenCalled();
    expect(
      (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn,
    ).toBeTypeOf("function");

    vi.advanceTimersByTime(60_000);
    expect(logout).toHaveBeenCalledWith("idleTimeout");
    stop();
  });

  it("Admin: DOM events do not reset idle; API activity event does", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "admin-tok");
    decodeToken.mockReturnValue({
      role: SystemRoles.Admin,
      adminIdleTimeoutMinutes: 3,
    });
    getPolicy.mockResolvedValue({
      success: true,
      data: { adminIdleTimeoutMinutes: 3 },
    });

    const { startAdminIdleSession } = await import("./adminIdleSession");
    const stop = startAdminIdleSession();
    await flush();

    vi.advanceTimersByTime(2 * 60_000);
    window.dispatchEvent(new Event("mousedown"));
    document.dispatchEvent(new Event("scroll", { bubbles: false }));
    notifyAdminApiActivity();

    vi.advanceTimersByTime(60_000);
    expect(logout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2 * 60_000);
    expect(logout).toHaveBeenCalledWith("idleTimeout");
    stop();
  });

  it("VpnUser (Google client): idle session is a no-op — no logout, no stay-signed-in hook", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "vpn-tok");
    decodeToken.mockReturnValue({
      role: SystemRoles.VpnUser,
    });

    const { startAdminIdleSession } = await import("./adminIdleSession");
    const stop = startAdminIdleSession();
    await flush();

    expect(
      (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn,
    ).toBeUndefined();

    vi.advanceTimersByTime(60 * 60_000);
    expect(logout).not.toHaveBeenCalled();
    expect(postActivity).not.toHaveBeenCalled();
    expect(getPolicy).not.toHaveBeenCalled();
    stop();
  });
});
