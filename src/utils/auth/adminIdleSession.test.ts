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
import { startAdminIdleSession } from "./adminIdleSession";

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
});
