import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: ["Admin"] }),
  isAdmin: () => true,
}));
vi.mock("../../utils/auth/canViewUserStatisticsScope", () => ({
  canViewUserStatisticsScope: () => true,
}));

vi.mock("../../hooks/useProxyTrafficFlow", () => ({
  useProxyTrafficFlowMany: () => ({ flows: [], connected: false }),
}));

vi.mock("../../components/DateRangeFilter", () => ({
  default: () => <div data-testid="date-range" />,
}));
vi.mock("./StatsCards", () => ({ default: () => <div data-testid="stats-cards" /> }));
vi.mock("./OverviewChart", () => ({ default: () => <div data-testid="overview-chart" /> }));
vi.mock("./GeoMap", () => ({ default: () => <div data-testid="geo-map" /> }));
vi.mock("./StatisticsScopeBanner", () => ({ StatisticsScopeBanner: () => null }));
vi.mock("./OverviewUserProfileCard", () => ({ OverviewUserProfileCard: () => null }));
vi.mock("../../components/pihole/UserDnsQueriesSection", () => ({ UserDnsQueriesSection: () => null }));
vi.mock("../../components/openvpn/UserOpenVpnEventsSection", () => ({ UserOpenVpnEventsSection: () => null }));
vi.mock("../../components/openvpn/UserClientAppVersionsSection", () => ({
  UserClientAppVersionsSection: () => null,
}));
vi.mock("../../components/pihole/TopVisitedDomainsSection", () => ({ TopVisitedDomainsSection: () => null }));

vi.mock("../../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  getApiOpenVpnClientsGetAllConnected: vi.fn(),
  useGetApiOpenVpnClientsGetAllConnected: () => ({ data: { clients: [] }, isLoading: false }),
  useGetApiOpenVpnClientsOverviewPoints: () => ({ data: { points: [] }, isLoading: false, error: null }),
  useGetApiOpenVpnClientsOverviewSeries: () => ({
    data: { series: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetApiOpenVpnClientsOverviewSummary: () => ({
    data: { totals: {} },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetApiOpenVpnClientsOverviewUsers: () => ({
    data: { users: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetApiOpenVpnClientsOverviewUsersSeries: () => ({
    data: { series: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  useGetApiV3OpenVpnServersGetAll: () => ({ data: { servers: [] }, isLoading: false }),
  useGetApiV3OpenVpnServersGetAllWithStatus: () => ({ data: { servers: [] }, isLoading: false }),
}));

vi.mock("../../api/orval/user/user", () => ({
  useGetApiUsersGetAll: () => ({ data: { users: [], totalCount: 0 }, isLoading: false }),
}));

import ServersOverview from "./index";

describe("ServersOverview", () => {
  it("renders aggregate overview heading and core sections", async () => {
    renderWithProviders(<ServersOverview />, { route: "/servers" });

    expect(await screen.findByRole("heading", { name: /All servers overview|Server statistics/i })).toBeInTheDocument();
    expect(screen.getByTestId("date-range")).toBeInTheDocument();
    expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
  });
});
