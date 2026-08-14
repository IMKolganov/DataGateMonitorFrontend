import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const logout = vi.fn();
vi.mock("../../api/apirequest", () => ({ logout: () => logout() }));
vi.mock("../../api/orval/auth/auth", () => ({
  getApiAuthSessionPolicy: vi.fn(async () => ({ adminIdleTimeoutMinutes: 15 })),
  postApiAuthActivity: vi.fn(async () => ({})),
}));
vi.mock("../../api/orvalPayload", () => ({
  orvalPayload: <T,>(v: T) => v,
}));

const decodeToken = vi.fn();
vi.mock("./jwt", () => ({
  decodeToken: (t: string) => decodeToken(t),
}));

import { ACCESS_TOKEN_KEY } from "../const";
import { SystemRoles } from "../../constants/systemRoles";
import { ADMIN_IDLE_WARNING_BEFORE_MS, startAdminIdleSession } from "./adminIdleSession";
import { ADMIN_IDLE_WARNING_EVENT, type AdminIdleWarningDetail } from "./adminIdleSessionEvents";

describe("startAdminIdleSession", () => {
  beforeEach(() => {
    localStorage.clear();
    logout.mockClear();
    decodeToken.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no-ops without access token", () => {
    const stop = startAdminIdleSession();
    expect(typeof stop).toBe("function");
    stop();
  });

  it("no-ops for non-admin tokens", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    decodeToken.mockReturnValue({ role: "User" });
    const stop = startAdminIdleSession();
    stop();
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out after idle timeout for admins", () => {
    vi.useFakeTimers();
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    decodeToken.mockReturnValue({
      role: SystemRoles.Admin,
      adminIdleTimeoutMinutes: 1,
    });

    const stop = startAdminIdleSession();
    vi.advanceTimersByTime(60_000);
    expect(logout).toHaveBeenCalledTimes(1);
    stop();
  });

  it("emits warning one minute before logout when timeout is longer", () => {
    vi.useFakeTimers();
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    decodeToken.mockReturnValue({
      role: SystemRoles.Admin,
      adminIdleTimeoutMinutes: 3,
    });

    const warnings: AdminIdleWarningDetail[] = [];
    const onWarn = (ev: Event) => {
      warnings.push((ev as CustomEvent<AdminIdleWarningDetail>).detail);
    };
    window.addEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);

    const stop = startAdminIdleSession();
    const beforeWarning = 3 * 60_000 - ADMIN_IDLE_WARNING_BEFORE_MS - 1;
    vi.advanceTimersByTime(beforeWarning);
    expect(warnings).toHaveLength(0);

    vi.advanceTimersByTime(2);
    expect(warnings).toHaveLength(1);
    expect(logout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(logout).toHaveBeenCalledTimes(1);

    window.removeEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
    stop();
  });
});
