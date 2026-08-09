import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    configureLogging() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    build() {
      return {
        on: vi.fn(),
        off: vi.fn(),
        start: vi.fn(async () => undefined),
        stop: vi.fn(async () => undefined),
        state: 0,
      };
    }
  },
  LogLevel: { None: 0 },
  HubConnectionState: { Connected: 1 },
}));

vi.mock("../utils/auth/signalRAccessToken", () => ({
  resolveHubAccessToken: async () => "t",
}));
vi.mock("../utils/signalrHubUrl", () => ({
  getProxyTrafficFlowHubUrl: () => "https://x/hubs/proxy-traffic-flow",
}));
vi.mock("../utils/signalrTransport", () => ({ getSignalRPreferredTransport: () => 0 }));

import { useProxyTrafficFlow, useProxyTrafficFlowMany } from "./useProxyTrafficFlow";

describe("useProxyTrafficFlow", () => {
  it("stays disabled with empty flows when not enabled", () => {
    const { result } = renderHook(() => useProxyTrafficFlow(false, 1));
    expect(result.current.flows).toEqual([]);
    expect(result.current.connectionState).toBe("disabled");
  });
});

describe("useProxyTrafficFlowMany", () => {
  it("returns empty when disabled", () => {
    const { result } = renderHook(() => useProxyTrafficFlowMany(false, [1, 2]));
    expect(result.current.flows).toEqual([]);
  });
});
