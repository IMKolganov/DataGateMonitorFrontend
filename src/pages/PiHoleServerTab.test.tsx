import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../test/mockDataGrid";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../hooks/usePersistedPageSize", () => persistedPageSizeMock(25));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true }),
  isAdmin: () => true,
}));
vi.mock("../components/pihole/PiHoleStatusPanel", () => ({
  PiHoleStatusPanel: () => <div data-testid="pihole-status-panel">status panel</div>,
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: {
      vpnServer: {
        id: 7,
        serverName: "s7",
        serverType: 0,
        apiUrl: "https://s7.example",
        isPiHoleEnabled: false,
        tags: [],
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  putApiOpenVpnServersUpdate: vi.fn(),
  getGetApiOpenVpnServersGetVpnServerIdQueryKey: (id: number) => ["server", id],
}));

vi.mock("../api/orval/tags/tags", () => ({
  useGetApiTagsGetAll: () => ({ data: { tags: [] }, isLoading: false }),
}));

vi.mock("../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId: () => ({
    data: { items: [] },
    isLoading: false,
  }),
}));

vi.mock("../api/orval/vpn-server-pi-hole-config/vpn-server-pi-hole-config", () => ({
  useGetApiOpenVpnServersPiHoleConfigVpnServerId: () => ({
    data: { config: null },
    isLoading: false,
  }),
  useGetApiOpenVpnServersPiHoleConfigVpnServerIdDiagnostics: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  putApiOpenVpnServersPiHoleConfig: vi.fn(),
  postApiOpenVpnServersPiHoleConfigVpnServerIdApplyRuntime: vi.fn(),
  getGetApiOpenVpnServersPiHoleConfigVpnServerIdQueryKey: (id: number) => ["pihole-config", id],
}));

vi.mock("../api/orval/vpn-dns-query/vpn-dns-query", () => ({
  getApiVpnDnsQueriesSearch: vi.fn(),
  getGetApiVpnDnsQueriesSearchQueryKey: () => ["dns"],
}));

import PiHoleServerTab from "./PiHoleServerTab";

describe("PiHoleServerTab", () => {
  it("renders Pi-hole heading and integration section", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/pi-hole" element={<PiHoleServerTab />} />
      </Routes>,
      { route: "/servers/7/pi-hole" },
    );

    expect(screen.getByRole("heading", { name: /Pi-hole DNS logging/i })).toBeInTheDocument();
    expect(screen.getByText(/Enable Pi-hole integration/i)).toBeInTheDocument();
    expect(screen.getByTestId("pihole-status-panel")).toBeInTheDocument();
  });

  it("shows connection form label", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/pi-hole" element={<PiHoleServerTab />} />
      </Routes>,
      { route: "/servers/7/pi-hole" },
    );

    expect(screen.getByLabelText(/Pi-hole API base URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Setup mode/i)).toBeInTheDocument();
  });
});
