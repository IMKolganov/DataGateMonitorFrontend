import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(25));

const refetch = vi.fn();

vi.mock("../api/orval/tv-login-sessions-admin/tv-login-sessions-admin", () => ({
  useGetApiAdminTvLoginSessions: () => ({
    data: {
      sessions: [
        {
          sessionId: "s1",
          userCode: "ABCD",
          status: "pending",
          deviceName: "Living Room",
          client: "tv",
          createDate: "2024-01-01T00:00:00Z",
        },
      ],
      totalCount: 1,
    },
    isFetching: false,
    error: null,
    refetch,
  }),
}));

import TvLoginSessionsSettings from "./TvLoginSessionsSettings";

describe("TvLoginSessionsSettings", () => {
  beforeEach(() => {
    refetch.mockClear();
  });

  it("renders TV sessions from Orval", () => {
    renderWithProviders(<TvLoginSessionsSettings />);
    expect(screen.getByText(/TV device linking/i)).toBeInTheDocument();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-rows").children.length).toBeGreaterThan(0);
  });

  it("refreshes sessions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TvLoginSessionsSettings />);
    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
