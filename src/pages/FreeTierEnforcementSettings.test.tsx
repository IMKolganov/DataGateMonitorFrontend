import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockDataGrid, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const logEntries = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  createdAt: "2024-01-01T00:00:00Z",
  userDisplayName: `User ${i}`,
  vpnServerName: "s1",
  commonName: `cn${i}`,
  reason: 0,
  initiatedByDisplayName: null,
  killSucceeded: true,
  revokeRequested: false,
  revokeSucceeded: null,
  errorMessage: "",
}));

let logPage = 1;
vi.mock("../api/orval/settings/settings", () => ({
  useGetApiSettingsGet: () => ({ data: { value: "false" }, isFetching: false, refetch: vi.fn() }),
  usePostApiSettingsSet: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../api/orval/free-tier-enforcement/free-tier-enforcement", () => ({
  useGetApiFreeTierEnforcementCandidates: () => ({
    data: { candidates: [], totalCount: 0, connectedCount: 0 },
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGetApiFreeTierEnforcementDisconnectLog: (params: { Page: number; PageSize: number }) => {
    logPage = params.Page;
    return {
      data: {
        entries: {
          items: logEntries,
          totalCount: 55,
        },
      },
      isFetching: false,
      error: null,
    };
  },
}));
vi.mock("../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  usePostApiOpenVpnClientsKill: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import FreeTierEnforcementSettings from "./FreeTierEnforcementSettings";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FreeTierEnforcementSettings />
    </QueryClientProvider>,
  );
}

describe("FreeTierEnforcementSettings disconnect log pagination", () => {
  beforeEach(() => {
    logPage = 1;
  });

  it("uses server pagination for disconnect log and advances page", async () => {
    const user = userEvent.setup();
    renderPage();

    const grids = screen.getAllByTestId("mock-grid");
    const logGrid = grids.find((g) => g.getAttribute("data-pagination-mode") === "server");
    expect(logGrid).toBeTruthy();
    expect(logGrid).toHaveAttribute("data-row-count", "55");
    expect(logGrid).toHaveAttribute("data-page-size", "20");

    const nextButtons = screen.getAllByTestId("next-page");
    // candidates (client/uncontrolled) + disconnect log
    await user.click(nextButtons[nextButtons.length - 1]!);
    expect(logPage).toBe(2);
  });
});
