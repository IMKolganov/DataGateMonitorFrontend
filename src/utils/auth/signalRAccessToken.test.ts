import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_KEY } from "../const";

const refreshSessionTokens = vi.fn();
const logout = vi.fn();

vi.mock("../../api/apirequest", () => ({
  refreshSessionTokens: () => refreshSessionTokens(),
  logout: (...args: unknown[]) => logout(...args),
}));

const getTokenExpiration = vi.fn();
vi.mock("./jwt", () => ({
  getTokenExpiration: (token: string) => getTokenExpiration(token),
}));

import { resolveHubAccessToken } from "./signalRAccessToken";

describe("resolveHubAccessToken (SignalR must not force logout)", () => {
  beforeEach(() => {
    localStorage.clear();
    refreshSessionTokens.mockReset();
    logout.mockClear();
    getTokenExpiration.mockReset();
  });

  it("returns empty string when no access token — without calling logout", async () => {
    await expect(resolveHubAccessToken()).resolves.toBe("");
    expect(refreshSessionTokens).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("returns the current token when it is not near expiry", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "valid-token");
    getTokenExpiration.mockReturnValue({ expiresInMs: 120_000, expiresAt: Date.now() + 120_000 });

    await expect(resolveHubAccessToken()).resolves.toBe("valid-token");
    expect(refreshSessionTokens).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("refreshes silently when JWT is near expiry", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "old-token");
    getTokenExpiration.mockReturnValue({ expiresInMs: 30_000, expiresAt: Date.now() + 30_000 });
    refreshSessionTokens.mockResolvedValue("fresh-token");

    await expect(resolveHubAccessToken()).resolves.toBe("fresh-token");
    expect(refreshSessionTokens).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });

  it("returns empty string when refresh fails — without calling logout", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired-token");
    getTokenExpiration.mockReturnValue({ expiresInMs: -1, expiresAt: Date.now() - 1 });
    refreshSessionTokens.mockRejectedValue({ response: { status: 401 } });

    await expect(resolveHubAccessToken()).resolves.toBe("");
    expect(refreshSessionTokens).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });
});
