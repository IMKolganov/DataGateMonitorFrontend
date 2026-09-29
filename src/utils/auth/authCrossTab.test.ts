import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../const";

const logout = vi.fn();
const isLoginRedirectInProgress = vi.fn(() => false);

vi.mock("../../api/apirequest", () => ({
  logout: (...args: unknown[]) => logout(...args),
  isLoginRedirectInProgress: () => isLoginRedirectInProgress(),
}));

import { startAuthCrossTabSync } from "./authCrossTab";

describe("startAuthCrossTabSync", () => {
  beforeEach(() => {
    localStorage.clear();
    logout.mockClear();
    isLoginRedirectInProgress.mockReturnValue(false);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/servers", search: "" },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("signs out when another tab clears both auth tokens", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");
    const stop = startAuthCrossTabSync();

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: ACCESS_TOKEN_KEY,
        oldValue: "access",
        newValue: null,
        storageArea: localStorage,
      }),
    );

    expect(logout).toHaveBeenCalledWith("loggedOutElsewhere");
    stop();
  });

  it("does not sign out when only access is cleared but refresh remains", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");
    const stop = startAuthCrossTabSync();

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: ACCESS_TOKEN_KEY,
        oldValue: "access",
        newValue: null,
        storageArea: localStorage,
      }),
    );

    expect(logout).not.toHaveBeenCalled();
    stop();
  });

  it("ignores storage events for unrelated keys", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");
    const stop = startAuthCrossTabSync();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "theme",
        oldValue: "dark",
        newValue: "light",
        storageArea: localStorage,
      }),
    );

    expect(logout).not.toHaveBeenCalled();
    stop();
  });

  it("does nothing when redirect already started", () => {
    isLoginRedirectInProgress.mockReturnValue(true);
    const stop = startAuthCrossTabSync();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: ACCESS_TOKEN_KEY,
        oldValue: "access",
        newValue: null,
        storageArea: localStorage,
      }),
    );

    expect(logout).not.toHaveBeenCalled();
    stop();
  });
});
