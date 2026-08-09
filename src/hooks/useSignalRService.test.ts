import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const handlers = new Map<string, (payload: unknown) => void>();
const startMock = vi.fn(async () => undefined);
const stopMock = vi.fn(async () => undefined);

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
        on: (event: string, cb: (payload: unknown) => void) => {
          handlers.set(event, cb);
        },
        start: startMock,
        stop: stopMock,
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
  postApiOpenVpnServersRunNow: vi.fn(async () => ({ ok: true })),
}));

import useSignalRService from "./useSignalRService";
import { ACCESS_TOKEN_KEY } from "../utils/const";
import { postApiOpenVpnServersRunNow } from "../api/orval/vpn-servers/vpn-servers";

describe("useSignalRService", () => {
  beforeEach(() => {
    localStorage.clear();
    handlers.clear();
    startMock.mockClear();
    stopMock.mockClear();
  });

  it("reports no-token when access token is missing", async () => {
    const { result } = renderHook(() => useSignalRService());
    await waitFor(() => expect(result.current.connectionState).toBe("no-token"));
    expect(result.current.lastError).toMatch(/No token/i);
  });

  it("connects when token is present and applies StatusUpdated payloads", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    const { result } = renderHook(() => useSignalRService());
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));

    const onStatus = handlers.get("StatusUpdated");
    expect(onStatus).toBeTypeOf("function");

    act(() => {
      onStatus?.({
        statuses: [
          {
            VpnServerId: 12,
            Status: 1,
            NextRunTime: "2024-06-01T12:00:00.000Z",
            CountConnectedClients: 3,
            IsOnline: true,
          },
        ],
      });
    });

    await waitFor(() => expect(result.current.serviceData[12]?.vpnServerId).toBe(12));
    expect(result.current.serviceData[12]?.countConnectedClients).toBe(3);
    expect((result.current.serviceData[12] as { isOnline?: boolean } | undefined)?.isOnline).toBe(true);
  });

  it("runServiceNow posts run-now", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    const { result } = renderHook(() => useSignalRService());
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));
    await act(async () => {
      await result.current.runServiceNow();
    });
    expect(postApiOpenVpnServersRunNow).toHaveBeenCalled();
  });
});
