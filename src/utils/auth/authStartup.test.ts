import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";

const scheduleAutoLogout = vi.fn();
const startAdminIdleSession = vi.fn(() => () => {});

vi.mock("./tokenExpiryScheduler", () => ({
  scheduleAutoLogout: (...args: unknown[]) => scheduleAutoLogout(...args),
}));

vi.mock("./adminIdleSession", () => ({
  startAdminIdleSession: () => startAdminIdleSession(),
}));

import { restoreAuthSessionOnStartup } from "./authStartup";

describe("restoreAuthSessionOnStartup", () => {
  beforeEach(() => {
    localStorage.clear();
    scheduleAutoLogout.mockClear();
    startAdminIdleSession.mockClear();
  });

  it("does nothing when no access token is stored", () => {
    const stop = restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).not.toHaveBeenCalled();
    expect(startAdminIdleSession).not.toHaveBeenCalled();
    expect(typeof stop).toBe("function");
    stop();
  });

  it("starts admin idle tracking when only access token exists (no refresh)", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-only");

    restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).not.toHaveBeenCalled();
    expect(startAdminIdleSession).toHaveBeenCalledTimes(1);
  });

  it("schedules JWT refresh and admin idle when both tokens exist", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");

    const stop = restoreAuthSessionOnStartup();

    expect(scheduleAutoLogout).toHaveBeenCalledWith("access");
    expect(startAdminIdleSession).toHaveBeenCalledTimes(1);
    expect(typeof stop).toBe("function");
  });
});
