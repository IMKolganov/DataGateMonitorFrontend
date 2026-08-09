import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return {
        on: vi.fn(),
        start: vi.fn(async () => undefined),
        stop: vi.fn(async () => undefined),
        onreconnecting: vi.fn(),
        onreconnected: vi.fn(),
        onclose: vi.fn(),
      };
    }
  },
  LogLevel: { None: 0 },
}));

vi.mock("../utils/auth/signalRAccessToken.ts", () => ({
  resolveHubAccessToken: async () => "t",
}));
vi.mock("../utils/signalrHubUrl.ts", () => ({
  getStatusStreamHubUrl: () => "https://api.example/api/hubs/status-stream",
}));
vi.mock("../utils/signalrTransport.ts", () => ({
  getSignalRPreferredTransport: () => 0,
}));
vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  postApiOpenVpnServersRunNow: vi.fn(async () => ({})),
}));

import useSignalRService from "./useSignalRService";
import { ACCESS_TOKEN_KEY } from "../utils/const";

describe("useSignalRService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reports no-token when access token is missing", async () => {
    const { result } = renderHook(() => useSignalRService());
    await waitFor(() => expect(result.current.connectionState).toBe("no-token"));
    expect(result.current.lastError).toMatch(/No token/i);
  });

  it("connects when token is present", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    const { result } = renderHook(() => useSignalRService());
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));
    expect(result.current.serviceData).toEqual({});
  });
});
