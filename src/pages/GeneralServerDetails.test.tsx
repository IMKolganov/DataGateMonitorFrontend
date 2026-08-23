import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { VpnServerType } from "../constants/vpnServerType";

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: ["Admin"] }),
  isAdmin: () => true,
}));

vi.mock("../hooks/useProxyTrafficFlow", () => ({
  useProxyTrafficFlow: () => ({ flows: [], connected: false }),
}));

vi.mock("../components/VpnMap", () => ({ default: () => <div data-testid="vpn-map" /> }));
vi.mock("../components/ClientsTable", () => ({ default: () => <div data-testid="clients-table" /> }));
vi.mock("../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => null }));
vi.mock("../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: {
      vpnServer: {
        id: 4,
        serverName: "Edge-4",
        serverType: VpnServerType.OpenVpn,
      },
    },
    isLoading: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
  }),
}));

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  useGetApiV3OpenVpnServersGetAllWithStatus: () => ({
    data: {
      vpnServerWithStatuses: [
        {
          vpnServerResponses: {
            vpnServer: {
              id: 4,
              serverName: "Edge-4",
              serverType: VpnServerType.OpenVpn,
            },
          },
          vpnServerStatusLogResponse: {
            version: "1.2.5.90",
          },
        },
      ],
    },
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  useGetApiOpenVpnClientsGetAllConnected: () => ({
    data: { vpnClients: [], totalCount: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetApiOpenVpnClientsGetAllHistory: () => ({
    data: { vpnClients: [], totalCount: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config", () => ({
  useGetApiOpenVpnConfigsGetVpnServerId: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../api/orval/vpn-server-conflog/vpn-server-conflog", () => ({
  useGetApiOpenVpnServersConflogHistoryByServerVpnServerId: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock("../api/orval/quota-plan/quota-plan", () => ({
  usePostApiQuotaPlansGetAll: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId: () => ({
    data: undefined,
    isFetched: true,
  }),
}));

vi.mock("../components/servers/OpenVpnProcessControls.tsx", () => ({
  OpenVpnProcessControls: () => <div data-testid="openvpn-process-controls" />,
}));

import GeneralServerDetails from "./GeneralServerDetails";

describe("GeneralServerDetails", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders refresh, live toggle, and VPN clients heading", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId" element={<GeneralServerDetails />} />
      </Routes>,
      { route: "/servers/4" },
    );

    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText(/VPN Clients \(Connected\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("openvpn-process-controls")).toBeInTheDocument();
  });
});
