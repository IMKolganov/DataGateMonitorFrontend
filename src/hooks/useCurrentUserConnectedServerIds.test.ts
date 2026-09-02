import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";

const useGetApiOpenVpnClientsUserConnectedServerIds = vi.fn();

vi.mock("../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  useGetApiOpenVpnClientsUserConnectedServerIds: (...args: unknown[]) =>
    useGetApiOpenVpnClientsUserConnectedServerIds(...args),
}));

const isAuthenticated = vi.fn(() => true);
vi.mock("../utils/auth/authSelectors", () => ({
  isAuthenticated: () => isAuthenticated(),
}));

import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "./useCurrentUserConnectedServerIds";

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCurrentUserConnectedServerIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated.mockReturnValue(true);
    useGetApiOpenVpnClientsUserConnectedServerIds.mockReturnValue({
      data: { vpnServerIds: [1, 5, 10] },
      isLoading: false,
    });
  });

  it("builds a Set of connected server ids from orval payload", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCurrentUserConnectedServerIds(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.connectedServerIds.has(1)).toBe(true);
      expect(result.current.connectedServerIds.has(5)).toBe(true);
      expect(result.current.connectedServerIds.has(99)).toBe(false);
    });
  });

  it("disables query when user is not authenticated", () => {
    isAuthenticated.mockReturnValue(false);
    renderHook(() => useCurrentUserConnectedServerIds(), {
      wrapper: wrapper(new QueryClient()),
    });

    expect(useGetApiOpenVpnClientsUserConnectedServerIds).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ enabled: false }),
      }),
    );
  });
});

describe("isUserConnectedToServer", () => {
  it("returns true only when server id is in the set", () => {
    const ids = new Set([2, 4]);
    expect(isUserConnectedToServer(ids, 2)).toBe(true);
    expect(isUserConnectedToServer(ids, 3)).toBe(false);
    expect(isUserConnectedToServer(ids, undefined)).toBe(false);
  });
});
