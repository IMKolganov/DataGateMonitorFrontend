import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../api/orval/applications/applications.ts", () => ({
  usePostApiApplicationsRevoke: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import ApplicationTable from "./ApplicationTable";

describe("ApplicationTable client pagination", () => {
  it("slices applications by persisted page size and advances pages", async () => {
    const user = userEvent.setup();
    const apps = Array.from({ length: 12 }, (_, i) => ({
      clientId: `c${i}`,
      name: `App ${i}`,
      clientSecret: `secret-${i}`,
    }));

    render(<ApplicationTable applications={apps} refreshApps={vi.fn()} />);

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "client");
    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("row-1")).toHaveTextContent("App 0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("row-6")).toHaveTextContent("App 5");
    expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
  });
});
