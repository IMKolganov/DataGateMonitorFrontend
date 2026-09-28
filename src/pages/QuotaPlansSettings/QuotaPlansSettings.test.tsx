import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    setValue: vi.fn(),
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    apply: vi.fn(),
    reset: vi.fn(),
    applied: {},
    queryParams: {},
  }),
}));
vi.mock("../../components/ui/GridFilterBar.tsx", () => ({
  GridFilterBar: () => <div data-testid="filter-bar" />,
}));
vi.mock("./QuotaPlanFormModal", () => ({ QuotaPlanFormModal: () => null }));
vi.mock("./QuotaPlanAllowedServersModal", () => ({ QuotaPlanAllowedServersModal: () => null }));

const plans = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Plan ${i}`,
  isDefault: i === 0,
  isActive: true,
}));

vi.mock("../../api/orval/quota-plans-v2/quota-plans-v2", () => ({
  getGetApiV2QuotaPlansQueryKey: () => ["quota-plans-v2"],
  useGetApiV2QuotaPlans: (params?: { Page?: number; PageSize?: number }) => {
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 5;
    const start = (page - 1) * pageSize;
    return {
      data: {
        quotaPlans: {
          items: plans.slice(start, start + pageSize),
          totalCount: plans.length,
          page,
          pageSize,
        },
      },
      isFetching: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("../../api/orval/quota-plan/quota-plan", () => ({
  usePostApiQuotaPlansCreate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePutApiQuotaPlansUpdate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteApiQuotaPlansDeleteId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePostApiQuotaPlansSetDefaultId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

import { QuotaPlansSettings } from "./QuotaPlansSettings";

describe("QuotaPlansSettings server pagination", () => {
  it("paginates quota plans via v2 Page params", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <QuotaPlansSettings />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    });
    expect(screen.getByTestId("row-1")).toHaveTextContent("Plan 0");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");

    await waitFor(() => {
      expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "12");
    });

    await user.click(screen.getByTestId("next-page"));
    await waitFor(() => {
      expect(screen.getByTestId("row-6")).toHaveTextContent("Plan 5");
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-page", "1");
  });
});
