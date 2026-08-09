import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(10));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock("../../api/orval/cert-expiry/cert-expiry.ts", () => ({
  getGetApiCertExpiryRunsQueryKey: () => ["cert-runs"],
  useGetApiCertExpiryRuns: () => ({
    data: {
      runs: [
        {
          runId: "run-1",
          scopeLabel: "All servers",
          startedAtUtc: "2024-01-01T00:00:00Z",
          finishedAtUtc: "2024-01-01T00:01:00Z",
          status: 0,
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  usePostApiCertExpiryCheck: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { CertExpiryCheckPanel } from "./CertExpiryCheckPanel";

describe("CertExpiryCheckPanel", () => {
  it("renders check action and history rows", () => {
    renderWithProviders(<CertExpiryCheckPanel />);
    expect(screen.getByRole("button", { name: /Check all eligible servers/i })).toBeInTheDocument();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-rows").textContent).toContain("run-1");
  });
});
