import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";

const scheduleAutoLogout = vi.fn();
const startAdminIdleSession = vi.fn(() => () => {});
const startAuthCrossTabSync = vi.fn(() => () => {});
const refreshSessionTokens = vi.fn();
const logout = vi.fn();
const shouldLogoutOnRefreshError = vi.fn(() => true);

vi.mock("./tokenExpiryScheduler", () => ({
  scheduleAutoLogout: (...args: unknown[]) => scheduleAutoLogout(...args),
}));

vi.mock("./adminIdleSession", () => ({
  startAdminIdleSession: () => startAdminIdleSession(),
}));

vi.mock("./authCrossTab", () => ({
  startAuthCrossTabSync: () => startAuthCrossTabSync(),
}));

vi.mock("../../api/apirequest", () => ({
  refreshSessionTokens: (...args: unknown[]) => refreshSessionTokens(...args),
  logout: (...args: unknown[]) => logout(...args),
  shouldLogoutOnRefreshError: (...args: unknown[]) => shouldLogoutOnRefreshError(...args),
}));

import { restoreAuthSessionOnStartup } from "./authStartup";

describe("restoreAuthSessionOnStartup", () => {
  beforeEach(() => {
    localStorage.clear();
    scheduleAutoLogout.mockClear();
    startAdminIdleSession.mockClear();
    startAuthCrossTabSync.mockClear();
    refreshSessionTokens.mockReset();
    logout.mockClear();
    shouldLogoutOnRefreshError.mockReturnValue(true);
  });

  it("does nothing when no tokens are stored (still arms cross-tab sync)", () => {
    const stop = restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).not.toHaveBeenCalled();
    expect(startAdminIdleSession).not.toHaveBeenCalled();
    expect(refreshSessionTokens).not.toHaveBeenCalled();
    expect(startAuthCrossTabSync).toHaveBeenCalledTimes(1);
    expect(typeof stop).toBe("function");
    stop();
  });

  it("starts admin idle tracking when only access token exists (no refresh)", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-only");

    restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).not.toHaveBeenCalled();
    expect(startAdminIdleSession).toHaveBeenCalledTimes(1);
    expect(refreshSessionTokens).not.toHaveBeenCalled();
  });

  it("schedules JWT refresh and admin idle when both tokens exist", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");

    const stop = restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).toHaveBeenCalledWith("access");
    expect(startAdminIdleSession).toHaveBeenCalledTimes(1);
    expect(typeof stop).toBe("function");
  });

  it("silently refreshes when access is missing but refresh remains", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-only");
    refreshSessionTokens.mockResolvedValue("restored-access");

    restoreAuthSessionOnStartup();

    await vi.waitFor(() => {
      expect(refreshSessionTokens).toHaveBeenCalledTimes(1);
      expect(scheduleAutoLogout).toHaveBeenCalledWith("restored-access");
      expect(startAdminIdleSession).toHaveBeenCalledTimes(1);
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out with refreshRejected when silent restore is rejected", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-only");
    const err = Object.assign(new Error("nope"), { name: "RefreshAuthFailure" });
    refreshSessionTokens.mockRejectedValue(err);

    restoreAuthSessionOnStartup();

    await vi.waitFor(() => {
      expect(logout).toHaveBeenCalledWith("refreshRejected");
    });
    expect(startAdminIdleSession).not.toHaveBeenCalled();
  });
});
