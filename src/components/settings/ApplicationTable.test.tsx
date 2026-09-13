import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../api/orval/applications/applications.ts", () => ({
  usePostApiApplicationsRevoke: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import ApplicationTable from "./ApplicationTable";

describe("ApplicationTable server pagination", () => {
  it("renders all passed rows in server mode and forwards page changes", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    const pageItems = Array.from({ length: 5 }, (_, i) => ({
      clientId: `c${i}`,
      name: `App ${i}`,
      clientSecret: `secret-${i}`,
    }));

    const gridProps = {
      paginationMode: "server" as const,
      paginationModel: { page: 0, pageSize: 5 },
      rowCount: 12,
      onPaginationModelChange: (model: GridPaginationModel) => onPaginationModelChange(model),
      pageSizeOptions: [5, 10, 20],
    };

    render(
      <ApplicationTable applications={pageItems} refreshApps={vi.fn()} gridProps={gridProps} />,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("row-c0")).toHaveTextContent("App 0");
    expect(screen.getByTestId("row-c4")).toHaveTextContent("App 4");

    await user.click(screen.getByTestId("next-page"));
    expect(onPaginationModelChange).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
  });
});
