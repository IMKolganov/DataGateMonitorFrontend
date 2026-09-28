import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));

const refetch = vi.fn();

const sessions = Array.from({ length: 12 }, (_, i) => ({
  sessionId: `s${i}`,
  userCode: `CODE${i}`,
  status: "pending",
  deviceName: `Device ${i}`,
  client: "tv",
  createDate: "2024-01-01T00:00:00Z",
}));

vi.mock("../api/orval/tv-login-sessions-admin-v2/tv-login-sessions-admin-v2", () => ({
  useGetApiV2AdminTvLoginSessions: (params?: { Page?: number; PageSize?: number }) => {
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 5;
    const start = (page - 1) * pageSize;
    return {
      data: {
        sessions: {
          items: sessions.slice(start, start + pageSize),
          totalCount: sessions.length,
          page,
          pageSize,
        },
      },
      isFetching: false,
      error: null,
      refetch,
    };
  },
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

  it("paginates sessions via v2 Page params", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TvLoginSessionsSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    await waitFor(() => {
      expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "12");
    });
    expect(screen.getByTestId("grid-rows").textContent).toContain("Device 0");

    await user.click(screen.getByTestId("next-page"));
    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").textContent).toContain("Device 5");
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-page", "1");
  });
});
