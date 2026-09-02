import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../config/apiBase", () => ({ getApiBaseUrl: () => "https://dash.example/api" }));
vi.mock("../api/apirequest", () => ({ logout: vi.fn() }));

import { getAccessTokenOrLogout, getSignalRUrl } from "./signalr-url";
import { ACCESS_TOKEN_KEY } from "./const";
import { logout } from "../api/apirequest";

describe("signalr-url", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("builds hub url with encoded server id", () => {
    expect(getSignalRUrl("42")).toBe("https://dash.example/api/hubs/frontend?serverId=42");
  });

  it("throws when vpnServerId missing", () => {
    expect(() => getSignalRUrl("")).toThrow(/vpnServerId is required/);
  });

  it("returns token or logs out with missingToken", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    expect(getAccessTokenOrLogout()).toBe("tok");

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    expect(() => getAccessTokenOrLogout()).toThrow(/not authenticated/);
    expect(logout).toHaveBeenCalledWith("missingToken");
  });
});
