import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div data-testid="filter-bar" /> }));
vi.mock("../../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => ({
  ...persistedPageSizeMock(10),
  getStoredPageSize: () => 10,
  setStoredPageSize: vi.fn(),
}));
vi.mock("../../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));

vi.mock("../../api/orval/user/user", () => ({
  useGetApiUsersGetAll: () => ({
    data: {
      users: [
        {
          id: 42,
          displayName: "Alice Example",
          email: "alice@example.com",
          provider: "local",
          externalId: "42",
        },
      ],
      totalCount: 1,
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import UsersSettings from "./UsersSettings";

describe("UsersSettings", () => {
  it("renders Users heading and Orval users list", () => {
    renderWithProviders(<UsersSettings />);

    expect(screen.getByRole("heading", { name: /^Users$/i })).toBeInTheDocument();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByText(/Alice Example/i)).toBeInTheDocument();
  });
});
