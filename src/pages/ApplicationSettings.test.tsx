import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/settings/ApplicationTable.tsx", () => ({
  default: ({ applications }: { applications: { name?: string }[] }) => (
    <ul data-testid="apps-list">
      {applications.map((a, i) => (
        <li key={i}>{a.name ?? `app-${i}`}</li>
      ))}
    </ul>
  ),
}));

vi.mock("../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));

vi.mock("../components/ui/GridFilterBar.tsx", () => ({
  GridFilterBar: () => <div data-testid="filter-bar" />,
}));

const refetch = vi.fn().mockResolvedValue({});
const mutateAsync = vi.fn().mockResolvedValue({
  name: "New App",
  clientId: "new-client-id",
  clientSecret: "new-client-secret",
});

const appsData = {
  applications: [{ id: 1, name: "Existing App", clientId: "a", clientSecret: "b" }],
};

vi.mock("../api/orval/applications/applications", () => ({
  useGetApiApplicationsGetAll: () => ({
    data: appsData,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch,
  }),
  usePostApiApplicationsRegister: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

import { ApplicationSettings } from "./ApplicationSettings";

describe("ApplicationSettings", () => {
  beforeEach(() => {
    refetch.mockClear();
    mutateAsync.mockClear();
  });

  it("renders applications from Orval list", () => {
    renderWithProviders(<ApplicationSettings />);
    expect(screen.getByRole("heading", { name: /API Clients/i })).toBeInTheDocument();
    expect(screen.getByTestId("apps-list").textContent).toContain("Existing App");
  });

  it("refreshes via Orval refetch", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApplicationSettings />);
    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("registers a new app via Orval mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApplicationSettings />);
    await user.type(screen.getByPlaceholderText(/Client name/i), "New App");
    await user.click(screen.getByRole("button", { name: /Create client/i }));
    expect(mutateAsync).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("new-client-secret")).toBeInTheDocument();
  });
});
