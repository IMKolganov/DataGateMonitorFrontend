import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div /> }));
vi.mock("../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true }),
  isAdmin: () => true,
}));

const hoisted = vi.hoisted(() => ({ conflogPage: 1 }));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: { vpnServer: { id: 7, name: "s7", serverType: 0, apiUrl: "https://s7.example" } },
    isLoading: false,
    isSuccess: true,
  }),
}));
vi.mock("../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config", () => ({
  useGetApiOpenVpnConfigsGetVpnServerId: () => ({
    data: {
      ovpnFileConfig: {
        id: 1,
        vpnServerId: 7,
        vpnServerIp: "1.2.3.4",
        vpnServerPort: 1194,
        configTemplate: "client",
      },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePostApiOpenVpnConfigsAddUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../api/orval/vpn-server-conflog/vpn-server-conflog", () => ({
  useGetApiOpenVpnServersConflogHistoryByServerVpnServerId: (
    _id: number,
    params?: { Page?: number; PageSize?: number },
  ) => {
    // Ignore the "latest snapshot" probe (PageSize: 1).
    if (params?.Page != null && (params.PageSize ?? 0) > 1) {
      hoisted.conflogPage = params.Page;
    }
    return {
      data: {
        items: [
          {
            id: hoisted.conflogPage,
            createDate: "2024-01-01T00:00:00Z",
            contentPreview: `log-p${hoisted.conflogPage}`,
          },
        ],
        totalCount: 30,
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    };
  },
  usePostApiOpenVpnServersConflogFetchAndSaveByServerVpnServerId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  getGetApiOpenVpnServersConflogHistoryByServerVpnServerIdQueryKey: () => ["conflog"],
}));

import OvpnFileConfigForm from "./OvpnFileConfigForm";

describe("OvpnFileConfigForm conflog pagination", () => {
  it("forwards conflog grid page to API (1-based)", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/servers/7/ovpn-config"]}>
          <Routes>
            <Route path="/servers/:vpnServerId/ovpn-config" element={<OvpnFileConfigForm />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "30");

    await user.click(screen.getByTestId("next-page"));
    expect(hoisted.conflogPage).toBe(2);
  });
});
