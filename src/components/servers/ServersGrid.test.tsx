import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";

const authState = vi.hoisted(() => ({ admin: true }));

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("../../hooks/useSignalRService", () => ({
  default: () => ({
    serviceData: null,
    runServiceNow: vi.fn(),
    connectionState: "Disconnected",
    lastError: null,
  }),
}));

vi.mock("./ServerItem", () => ({
  default: ({
    server,
    vpnServerId,
  }: {
    server: { vpnServerResponses?: { vpnServer?: { serverName?: string; isDeleted?: boolean } } };
    vpnServerId: number;
  }) => (
    <div data-testid={`server-item-${vpnServerId}`}>
      {server.vpnServerResponses?.vpnServer?.serverName ?? vpnServerId}
      {server.vpnServerResponses?.vpnServer?.isDeleted ? " [deleted]" : ""}
    </div>
  ),
}));

vi.mock("../ServiceControls", () => ({ default: () => <div data-testid="service-controls" /> }));

vi.mock("react-responsive", () => ({
  useMediaQuery: () => false,
}));

vi.mock("../../api/orval/vpn-servers/vpn-servers", () => ({
  deleteApiOpenVpnServersDeleteVpnServerId: vi.fn(),
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getApiV3OpenVpnServersGetAllWithStatus: vi.fn(async () => ({
    vpnServerWithStatuses: [
      {
        vpnServerResponses: {
          vpnServer: {
            id: 1,
            serverName: "Alpha",
            apiUrl: "https://10.51.48.12:5010/",
            isOnline: true,
            isDeleted: false,
          },
        },
        vpnServerStatusLogResponse: { serverRemoteIp: "81.27.100.144" },
        countConnectedClients: 0,
        countSessions: 0,
      },
      {
        vpnServerResponses: {
          vpnServer: {
            id: 2,
            serverName: "Ghost",
            apiUrl: "https://212.147.239.128:8443/",
            isOnline: false,
            isDeleted: true,
          },
        },
        countConnectedClients: 0,
        countSessions: 0,
      },
    ],
  })),
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: (params?: { includeDeleted?: boolean }) =>
    params
      ? ["/api/v3/open-vpn-servers/get-all-with-status", params]
      : ["/api/v3/open-vpn-servers/get-all-with-status"],
}));

vi.mock("../../api/orval/vpn-server-groups/vpn-server-groups", () => ({
  useGetApiVpnServerGroupsGetAll: () => ({
    data: {
      groups: [{ id: 10, name: "EU", serverIds: [1], sortOrder: 0 }],
    },
    refetch: vi.fn(),
  }),
  usePostApiVpnServerGroupsCreate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePutApiVpnServerGroupsUpdateId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApiVpnServerGroupsDeleteId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getGetApiVpnServerGroupsGetAllQueryKey: () => ["/api/vpn-server-groups/get-all"],
}));

vi.mock("./PendingDiscoveriesBadgeButton", () => ({
  PendingDiscoveriesBadgeButton: () => null,
}));

vi.mock("./AddServersToGroupModal", () => ({
  AddServersToGroupModal: () => null,
}));

vi.mock("../../hooks/useCurrentUserConnectedServerIds", () => ({
  useCurrentUserConnectedServerIds: () => ({ connectedServerIds: new Set<number>() }),
  isUserConnectedToServer: () => false,
}));

import ServersGrid from "./ServersGrid";
import { getApiV3OpenVpnServersGetAllWithStatus } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";

describe("ServersGrid", () => {
  beforeEach(() => {
    authState.admin = true;
    vi.clearAllMocks();
    try {
      localStorage.removeItem("datagate.serverList.showDeleted");
    } catch {
      // ignore
    }
  });

  it("renders grouped tile grid and hides deleted by default", async () => {
    renderWithProviders(<ServersGrid />, { route: "/servers" });

    expect(await screen.findByTestId("server-item-1")).toHaveTextContent("Alpha");
    expect(screen.queryByTestId("server-item-2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Server/i })).toBeInTheDocument();
    expect(screen.getByText("EU")).toBeInTheDocument();
    expect(document.querySelector(".servers-grid")).toBeTruthy();
    expect(document.querySelector(".servers-grid-groups")).toBeTruthy();
  });

  it("shows deleted servers after toggle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServersGrid />, { route: "/servers" });

    await screen.findByTestId("server-item-1");
    await user.click(screen.getByRole("button", { name: /Show deleted/i }));

    expect(await screen.findByTestId("server-item-2")).toHaveTextContent("Ghost");
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("filters by IP search including deleted matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServersGrid />, { route: "/servers" });

    await screen.findByTestId("server-item-1");
    await user.type(
      screen.getByRole("searchbox", { name: /Search servers by IP/i }),
      "212.147.239.128",
    );

    expect(await screen.findByTestId("server-item-2")).toBeInTheDocument();
    expect(screen.queryByTestId("server-item-1")).not.toBeInTheDocument();
  });

  it("refetches on refresh", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServersGrid />, { route: "/servers" });

    await screen.findByTestId("server-item-1");
    expect(vi.mocked(getApiV3OpenVpnServersGetAllWithStatus)).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(vi.mocked(getApiV3OpenVpnServersGetAllWithStatus)).toHaveBeenCalledTimes(2);
  });
});
