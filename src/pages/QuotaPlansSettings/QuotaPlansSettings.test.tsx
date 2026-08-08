import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("../../api/orval/quota-plan/quota-plan", () => ({
  usePostApiQuotaPlansGetAll: () => ({
    mutate: (_vars: unknown, opts?: { onSuccess?: (raw: unknown) => void }) => {
      opts?.onSuccess?.({ data: { quotaPlans: plans } });
    },
    isPending: false,
  }),
  usePostApiQuotaPlansCreate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePutApiQuotaPlansUpdate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeleteApiQuotaPlansDeleteId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePostApiQuotaPlansSetDefaultId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

import { QuotaPlansSettings } from "./QuotaPlansSettings";

describe("QuotaPlansSettings client pagination", () => {
  it("paginates loaded quota plans", async () => {
    const user = userEvent.setup();
    render(<QuotaPlansSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    });
    expect(screen.getByTestId("row-1")).toHaveTextContent("Plan 0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("row-6")).toHaveTextContent("Plan 5");
  });
});
