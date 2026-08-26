import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRATION,
  REFRESH_TOKEN_KEY,
} from "../utils/const";

const scheduleAutoLogout = vi.fn();
const axiosRequest = vi.fn();
const axiosPost = vi.fn();

function isAxiosError(err: unknown): err is { response?: { status?: number } } {
  return Boolean(err && typeof err === "object" && (err as { isAxiosError?: boolean }).isAxiosError);
}

vi.mock("../utils/auth/tokenExpiryScheduler.ts", () => ({
  scheduleAutoLogout: (...args: unknown[]) => scheduleAutoLogout(...args),
}));

vi.mock("../utils/auth/storedProfileAvatar.ts", () => ({
  clearStoredProfileAvatarUrl: vi.fn(),
}));

vi.mock("axios", () => {
  const fn = (config: unknown) => axiosRequest(config);
  Object.assign(fn, {
    request: (...args: unknown[]) => axiosRequest(...args),
    post: (...args: unknown[]) => axiosPost(...args),
    isAxiosError,
  });
  return {
    default: fn,
    isAxiosError,
  };
});

import { apiRequest, logout, shouldLogoutOnRefreshError } from "./apirequest";

describe("shouldLogoutOnRefreshError", () => {
  it("returns false for non-objects", () => {
    expect(shouldLogoutOnRefreshError(null)).toBe(false);
    expect(shouldLogoutOnRefreshError("x")).toBe(false);
  });

  it("returns true for missing refresh token and RefreshAuthFailure", () => {
    expect(shouldLogoutOnRefreshError({ message: "No refresh token" })).toBe(true);
    expect(shouldLogoutOnRefreshError({ name: "RefreshAuthFailure" })).toBe(true);
  });

  it("returns true for 401/403 response status", () => {
    expect(shouldLogoutOnRefreshError({ response: { status: 401 } })).toBe(true);
    expect(shouldLogoutOnRefreshError({ response: { status: 403 } })).toBe(true);
    expect(shouldLogoutOnRefreshError({ response: { status: 500 } })).toBe(false);
  });
});

describe("logout redirect with reason", () => {
  const assign = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    assign.mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/servers",
        search: "",
        assign,
      },
    });
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");
    localStorage.setItem(REFRESH_TOKEN_EXPIRATION, "2099-01-01T00:00:00Z");
  });

  it("clears tokens and redirects with reason when provided", () => {
    logout("sessionExpired");

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_EXPIRATION)).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login?reason=sessionExpired");
  });

  it("redirects without reason for voluntary sign-out", () => {
    logout();

    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("does not redirect when already on /login", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/login", search: "", assign },
    });

    logout("sessionExpired");

    expect(assign).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it("preserves tv/link redirect query together with reason", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/tv/link",
        search: "?code=ABC",
        assign,
      },
    });

    logout("refreshRejected");

    expect(assign).toHaveBeenCalledWith(
      "/login?redirect=%2Ftv%2Flink%3Fcode%3DABC&reason=refreshRejected",
    );
  });
});

describe("apiRequest auth failure paths", () => {
  const assign = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    assign.mockClear();
    scheduleAutoLogout.mockClear();
    axiosRequest.mockReset();
    axiosPost.mockReset();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/servers", search: "", assign },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ apiBaseUrl: "https://api.test" }),
      })),
    );

    localStorage.setItem(ACCESS_TOKEN_KEY, "access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("soft-logouts with missingToken reason when access token is missing", async () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    await expect(apiRequest("get", "/api/servers")).rejects.toThrow(
      "User is not authenticated",
    );

    expect(assign).toHaveBeenCalledWith("/login?reason=missingToken");
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  it("retries after 401 when refresh succeeds", async () => {
    axiosRequest
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({
        data: { success: true, data: { id: 1 } },
      });

    axiosPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: { token: "new-access", refreshToken: "new-refresh" },
      },
    });

    const result = await apiRequest<{ id: number }>("get", "/api/servers");

    expect(result.data.id).toBe(1);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("new-access");
    expect(scheduleAutoLogout).toHaveBeenCalledWith("new-access");
    expect(assign).not.toHaveBeenCalled();
  });

  it("logs out with refreshRejected when 401 refresh returns 403", async () => {
    axiosRequest.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
    axiosPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });

    await expect(apiRequest("get", "/api/servers")).rejects.toBeTruthy();

    expect(assign).toHaveBeenCalledWith("/login?reason=refreshRejected");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it("does not attempt refresh on auth endpoints", async () => {
    axiosRequest.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });

    await expect(
      apiRequest("post", "/api/auth/login", {}, true),
    ).rejects.toBeTruthy();

    expect(axiosPost).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
