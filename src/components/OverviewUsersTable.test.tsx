import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../test/mockDataGrid";

vi.mock("./ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("./ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("./ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("./ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div /> }));
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
vi.mock("../hooks/useTelegramProfilePhotoIndex.ts", () => ({
  useTelegramProfilePhotoIndex: () => ({ index: new Map() }),
}));
vi.mock("../utils/auth/authSelectors.ts", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true, displayName: "Admin" }),
  isAdmin: () => true,
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => ({}) };
});

const overviewUsers = Array.from({ length: 12 }, (_, i) => ({
  externalId: `ext-${i}`,
  displayName: `User ${i}`,
  vpnServerId: 1,
  sessions: 1,
  trafficInBytes: 0,
  trafficOutBytes: 0,
  trafficTotalBytes: 0,
}));

vi.mock("../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  useGetApiOpenVpnClientsOverviewUsers: () => ({
    data: { overviewUserItems: overviewUsers },
    isFetching: false,
    isError: false,
    error: null,
  }),
}));
vi.mock("../api/orval/user/user", () => ({
  useGetApiUsersGetAll: () => ({ data: { users: [] }, isFetching: false }),
}));

import { OverviewUsersTable } from "./OverviewUsersTable";

describe("OverviewUsersTable client pagination", () => {
  it("slices overview users across pages", async () => {
    const user = userEvent.setup();
    render(
      <OverviewUsersTable from={new Date("2024-01-01")} to={new Date("2024-01-31")} vpnServerId={1} />,
    );

    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("grid-rows").textContent).toContain("User 0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("grid-rows").textContent).toContain("User 5");
    expect(screen.getByTestId("grid-rows").textContent).not.toContain("User 0");
  });
});
