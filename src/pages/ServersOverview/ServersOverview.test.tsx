import { describe, expect, it, vi, beforeEach } from "vitest";
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
vi.mock("../../components/OverviewUsersTable", () => ({
  OverviewUsersTable: () => <div data-testid="overview-users" />,
}));
vi.mock("../../components/VpnMap", () => ({
  default: () => <div data-testid="vpn-map" />,
}));
vi.mock("./OverviewUserProfileCard", () => ({ OverviewUserProfileCard: () => null }));
vi.mock("../../components/pihole/UserDnsQueriesSection", () => ({ UserDnsQueriesSection: () => null }));
vi.mock("../../components/openvpn/UserOpenVpnEventsSection", () => ({ UserOpenVpnEventsSection: () => null }));
vi.mock("../../components/openvpn/UserClientAppVersionsSection", () => ({
  UserClientAppVersionsSection: () => null,
}));
vi.mock("../../components/pihole/TopVisitedDomainsSection", () => ({ TopVisitedDomainsSection: () => null }));

vi.mock("../../hooks/useCurrentUserConnectedServerIds", () => ({
  useCurrentUserConnectedServerIds: () => ({ connectedServerIds: new Set<number>() }),
  isUserConnectedToServer: () => false,
}));

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
  beforeEach(() => {
    try {
      localStorage.removeItem("datagate.overviewSection");
    } catch {
      // ignore
    }
  });

  it("renders aggregate overview heading, filter, stats, and section tabs", async () => {
    renderWithProviders(<ServersOverview />, { route: "/overview" });

    expect(await screen.findByRole("heading", { name: /All servers overview|Server statistics/i })).toBeInTheDocument();
    expect(screen.getByTestId("date-range")).toBeInTheDocument();
    expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Overview sections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chart" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("overview-chart")).toBeInTheDocument();
  });

  it("switches to Users and Map sections", async () => {
    const user = await import("@testing-library/user-event").then((m) => m.default.setup());
    renderWithProviders(<ServersOverview />, { route: "/overview" });

    await screen.findByRole("tab", { name: "Chart" });
    await user.click(screen.getByRole("tab", { name: "Users" }));
    expect(screen.getByRole("tab", { name: "Users" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("overview-chart")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Map" }));
    expect(screen.getByRole("tab", { name: "Map" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("geo-map")).toBeInTheDocument();
  });
});
