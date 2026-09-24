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
  default: () => ({ serviceData: null, connected: false }),
}));

vi.mock("./ServerItem", () => ({
  default: ({
    server,
    vpnServerId,
  }: {
    server: { vpnServerResponses?: { vpnServer?: { serverName?: string } } };
    vpnServerId: number;
  }) => (
    <div data-testid={`server-item-${vpnServerId}`}>
      {server.vpnServerResponses?.vpnServer?.serverName ?? vpnServerId}
    </div>
  ),
}));

vi.mock("../ServiceControls", () => ({ default: () => <div data-testid="service-controls" /> }));

vi.mock("./PendingDiscoveriesBadgeButton", () => ({
  PendingDiscoveriesBadgeButton: () => null,
}));

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
            serverType: 0,
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
            serverType: 0,
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
    data: { groups: [] },
    refetch: vi.fn(),
  }),
  usePostApiVpnServerGroupsCreate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePutApiVpnServerGroupsUpdateId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApiVpnServerGroupsDeleteId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  putApiVpnServerGroupsReorder: vi.fn(),
  putApiVpnServerGroupsIdSetServers: vi.fn(),
  putApiVpnServerGroupsUngroupedSetServers: vi.fn(),
  getGetApiVpnServerGroupsGetAllQueryKey: () => ["/api/vpn-server-groups/get-all"],
}));

vi.mock("../../hooks/useCurrentUserConnectedServerIds", () => ({
  useCurrentUserConnectedServerIds: () => ({ connectedServerIds: new Set<number>() }),
  isUserConnectedToServer: () => false,
}));

import ServerList from "./ServerList";
import { getApiV3OpenVpnServersGetAllWithStatus } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";

describe("ServerList", () => {
  beforeEach(() => {
    authState.admin = true;
    try {
      localStorage.removeItem("datagate.serverList.showDeleted");
    } catch {
      // ignore
    }
  });

  it("renders refresh and add server for admins after load", async () => {
    renderWithProviders(<ServerList />, { route: "/servers" });

    expect(await screen.findByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Server/i })).toBeInTheDocument();
    expect(await screen.findByTestId("server-item-1")).toHaveTextContent("Alpha");
    expect(screen.queryByTestId("server-item-2")).not.toBeInTheDocument();
  });

  it("hides add server for non-admins", async () => {
    authState.admin = false;
    renderWithProviders(<ServerList />, { route: "/servers" });

    expect(await screen.findByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Server/i })).not.toBeInTheDocument();
  });

  it("refetches servers on refresh click", async () => {
    vi.mocked(getApiV3OpenVpnServersGetAllWithStatus).mockClear();
    renderWithProviders(<ServerList />, { route: "/servers" });

    const refreshButton = await screen.findByRole("button", { name: /Refresh/i });
    await screen.findByTestId("server-item-1");

    expect(vi.mocked(getApiV3OpenVpnServersGetAllWithStatus)).toHaveBeenCalledTimes(1);

    await userEvent.click(refreshButton);

    expect(vi.mocked(getApiV3OpenVpnServersGetAllWithStatus)).toHaveBeenCalledTimes(2);
  });

  it("filters by IP and reveals deleted matches in Deleted section", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServerList />, { route: "/servers" });

    await screen.findByTestId("server-item-1");
    await user.type(
      screen.getByRole("searchbox", { name: /Search servers by IP/i }),
      "212.147.239.128",
    );

    expect(await screen.findByTestId("server-item-2")).toBeInTheDocument();
    expect(screen.queryByTestId("server-item-1")).not.toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("shows deleted servers when Show deleted is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServerList />, { route: "/servers" });

    await screen.findByTestId("server-item-1");
    await user.click(screen.getByRole("button", { name: /Show deleted/i }));

    expect(await screen.findByTestId("server-item-2")).toBeInTheDocument();
  });
});
