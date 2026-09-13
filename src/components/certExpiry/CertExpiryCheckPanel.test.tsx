import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const runs = Array.from({ length: 12 }, (_, i) => ({
  runId: `run-${i}`,
  scopeLabel: "All servers",
  startedAtUtc: "2024-01-01T00:00:00Z",
  finishedAtUtc: "2024-01-01T00:01:00Z",
  status: 0,
}));

vi.mock("../../api/orval/cert-expiry-v2/cert-expiry-v2.ts", () => ({
  getGetApiV2CertExpiryRunsQueryKey: () => ["cert-runs-v2"],
  useGetApiV2CertExpiryRuns: (params?: { Page?: number; PageSize?: number }) => {
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 5;
    const start = (page - 1) * pageSize;
    return {
      data: {
        runs: {
          items: runs.slice(start, start + pageSize),
          totalCount: runs.length,
          page,
          pageSize,
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("../../api/orval/cert-expiry/cert-expiry.ts", () => ({
  usePostApiCertExpiryCheck: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { CertExpiryCheckPanel } from "./CertExpiryCheckPanel";

describe("CertExpiryCheckPanel", () => {
  it("renders check action and history rows", () => {
    renderWithProviders(<CertExpiryCheckPanel />);
    expect(screen.getByRole("button", { name: /Check all eligible servers/i })).toBeInTheDocument();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-rows").textContent).toContain("run-0");
  });

  it("paginates check history via v2 Page params", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CertExpiryCheckPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    await waitFor(() => {
      expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "12");
    });
    expect(screen.getByTestId("grid-rows").textContent).toContain("run-0");

    await user.click(screen.getByTestId("next-page"));
    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").textContent).toContain("run-5");
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-page", "1");
  });
});
