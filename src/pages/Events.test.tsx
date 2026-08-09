import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div /> }));
vi.mock("../hooks/usePersistedPageSize", () => persistedPageSizeMock(10));
vi.mock("../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));
vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true }),
  isAdmin: () => true,
}));

const hoisted = vi.hoisted(() => {
  const state = { page: 1 };
  const eventsPayload = {
    events: {
      items: [
        {
          id: 1,
          eventType: "CONNECT",
          commonName: "evt-row",
          realAddress: "1.1.1.1",
          virtualAddress: "10.0.0.2",
          connectedSince: "2024-01-01T00:00:00Z",
          createDate: "2024-01-01T00:00:00Z",
        },
      ],
      totalCount: 40,
    },
  };
  return { state, eventsPayload };
});

vi.mock("../api/orval/vpn-server-event/vpn-server-event", () => ({
  useGetApiOpenVpnEventsGetByServer: (params: { Page?: number }) => {
    hoisted.state.page = params.Page ?? 1;
    return {
      data: hoisted.eventsPayload,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  getApiOpenVpnEventsGetByServer: vi.fn(),
}));
vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: { vpnServer: { id: 7, name: "s7", serverType: 0 } },
    isLoading: false,
    isError: false,
    isSuccess: true,
  }),
}));

import Events from "./Events";

describe("Events page server pagination", () => {
  it("forwards DataGrid page changes to the API page param", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/servers/7/events"]}>
        <Routes>
          <Route path="/servers/:vpnServerId/events" element={<Events />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "40");
    expect(screen.getByTestId("grid-rows").textContent).toContain("evt-row");

    await user.click(screen.getByTestId("next-page"));
    expect(hoisted.state.page).toBe(2);
  });
});
