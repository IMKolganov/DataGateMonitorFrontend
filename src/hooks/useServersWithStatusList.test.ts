import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const authState = vi.hoisted(() => ({ admin: true }));

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("./useSignalRService", () => ({
  default: () => ({
    serviceData: null,
    runServiceNow: vi.fn(),
    connectionState: "Disconnected",
    lastError: null,
  }),
}));

const getApiV3OpenVpnServersGetAllWithStatus = vi.fn();

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getApiV3OpenVpnServersGetAllWithStatus: (...args: unknown[]) =>
    getApiV3OpenVpnServersGetAllWithStatus(...args),
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: (params?: { includeDeleted?: boolean }) =>
    params
      ? ["/api/v3/open-vpn-servers/get-all-with-status", params]
      : ["/api/v3/open-vpn-servers/get-all-with-status"],
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  deleteApiOpenVpnServersDeleteVpnServerId: vi.fn(async () => undefined),
}));

vi.mock("../api/orval/vpn-server-groups/vpn-server-groups", () => ({
  useGetApiVpnServerGroupsGetAll: () => ({
    data: { groups: [{ id: 10, name: "EU", serverIds: [1], sortOrder: 0 }] },
    refetch: vi.fn(),
  }),
}));

import {
  coerceServiceStatus,
  pickServiceDataEntry,
  resolveServerId,
  serverRowIsDisabled,
  useServersWithStatusList,
  wsStatusIsPresent,
} from "./useServersWithStatusList";
import { deleteApiOpenVpnServersDeleteVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import { ServiceStatus } from "../api/orvalModelShim";

function makePayload() {
  return {
    vpnServerWithStatuses: [
      {
        vpnServerResponses: {
          vpnServer: {
            id: 1,
            serverName: "Alpha",
            apiUrl: "https://10.51.48.12:5010/",
            isOnline: true,
            isDeleted: false,
            groupId: 10,
            sortOrder: 0,
          },
        },
        vpnServerStatusLogResponse: {
          vpnServerId: 1,
          serverRemoteIp: "81.27.100.144",
        },
        countConnectedClients: 2,
        countSessions: 1,
      },
      {
        vpnServerResponses: {
          vpnServer: {
            id: 2,
            serverName: "Deleted-Node",
            apiUrl: "https://212.147.239.128:8443/",
            isOnline: false,
            isDeleted: true,
            sortOrder: 1,
          },
        },
        countConnectedClients: 0,
        countSessions: 0,
      },
      {
        vpnServerResponses: {
          vpnServer: {
            id: 3,
            serverName: "Beta",
            apiUrl: "https://beta.example/",
            isOnline: true,
            isDeleted: false,
            isDisabled: true,
            sortOrder: 2,
          },
        },
        countConnectedClients: 0,
        countSessions: 0,
      },
    ],
  };
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useServersWithStatusList helpers", () => {
  it("coerceServiceStatus maps known values", () => {
    expect(coerceServiceStatus(1)).toBe(1 as ServiceStatus);
    expect(coerceServiceStatus("running")).toBe(1 as ServiceStatus);
    expect(coerceServiceStatus("error")).toBe(2 as ServiceStatus);
    expect(coerceServiceStatus("idle")).toBe(0 as ServiceStatus);
    expect(coerceServiceStatus("nope")).toBe(0 as ServiceStatus);
  });

  it("resolveServerId prefers vpnServer.id then status log", () => {
    expect(
      resolveServerId({
        vpnServerResponses: { vpnServer: { id: 7 } },
      }),
    ).toBe(7);
    expect(
      resolveServerId({
        vpnServerStatusLogResponse: { vpnServerId: 9 },
      }),
    ).toBe(9);
    expect(resolveServerId({})).toBe(0);
  });

  it("pickServiceDataEntry accepts numeric and string keys", () => {
    const map = { 5: { vpnServerId: 5 } } as Record<number, { vpnServerId: number }>;
    expect(pickServiceDataEntry(map as never, 5)?.vpnServerId).toBe(5);
  });

  it("wsStatusIsPresent and serverRowIsDisabled", () => {
    expect(wsStatusIsPresent(undefined)).toBe(false);
    expect(wsStatusIsPresent({ status: 1 as ServiceStatus })).toBe(true);
    expect(
      serverRowIsDisabled({
        vpnServerResponses: { vpnServer: { isDisabled: true } },
      }),
    ).toBe(true);
  });
});

describe("useServersWithStatusList", () => {
  beforeEach(() => {
    authState.admin = true;
    vi.clearAllMocks();
    try {
      localStorage.removeItem("datagate.serverList.showDeleted");
    } catch {
      // ignore
    }
    getApiV3OpenVpnServersGetAllWithStatus.mockResolvedValue(makePayload());
  });

  it("loads servers with includeDeleted for admins and hides deleted by default", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useServersWithStatusList(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getApiV3OpenVpnServersGetAllWithStatus).toHaveBeenCalledWith({ includeDeleted: true });
    expect(result.current.servers.map((s) => s.id).sort()).toEqual([1, 2, 3]);
    expect(result.current.visibleServers.map((s) => s.id).sort()).toEqual([1, 3]);
    expect(result.current.sections.some((s) => s.key === "deleted")).toBe(false);
  });

  it("does not request deleted servers for non-admins", async () => {
    authState.admin = false;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useServersWithStatusList(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getApiV3OpenVpnServersGetAllWithStatus).toHaveBeenCalledWith(undefined);
    expect(result.current.canManage).toBe(false);
  });

  it("surfaces deleted servers when showDeleted is toggled", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useServersWithStatusList(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.toggleShowDeleted();
    });

    expect(result.current.showDeleted).toBe(true);
    expect(result.current.visibleServers.map((s) => s.id)).toContain(2);
    expect(result.current.sections.find((s) => s.key === "deleted")?.servers.map((s) => s.id)).toEqual([
      2,
    ]);
  });

  it("filters by IP search and reveals matching deleted servers without toggle", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useServersWithStatusList(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchQuery("212.147.239.128");
    });

    expect(result.current.visibleServers.map((s) => s.id)).toEqual([2]);
    expect(result.current.visibleServerCount).toBe(1);

    act(() => {
      result.current.setSearchQuery("81.27.100");
    });

    expect(result.current.visibleServers.map((s) => s.id)).toEqual([1]);
  });

  it("soft-deletes in cache for admins instead of removing the row", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { result } = renderHook(() => useServersWithStatusList(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(deleteApiOpenVpnServersDeleteVpnServerId).toHaveBeenCalledWith(1);
    await waitFor(() => {
      const alpha = result.current.servers.find((s) => s.id === 1);
      expect(alpha?.raw.vpnServerResponses?.vpnServer?.isDeleted).toBe(true);
    });
    confirmSpy.mockRestore();
  });
});
