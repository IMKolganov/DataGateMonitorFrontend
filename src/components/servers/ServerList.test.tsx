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
            isOnline: true,
            serverType: 0,
          },
        },
        countConnectedClients: 0,
        countSessions: 0,
      },
    ],
  })),
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["/api/v3/open-vpn-servers/get-all-with-status"],
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
  });

  it("renders refresh and add server for admins after load", async () => {
    renderWithProviders(<ServerList />, { route: "/servers" });

    expect(await screen.findByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Server/i })).toBeInTheDocument();
    expect(await screen.findByTestId("server-item-1")).toHaveTextContent("Alpha");
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
});
