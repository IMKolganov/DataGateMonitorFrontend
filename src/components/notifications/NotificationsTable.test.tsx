import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

import NotificationsTable from "./NotificationsTable";

describe("NotificationsTable pagination", () => {
  it("renders titles and forwards pagination model changes", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    const { container } = renderWithProviders(
      <NotificationsTable
        notifications={[
          { id: 7, title: "Node down", message: "s1 offline", isRead: false, severity: 2 },
        ]}
        totalCount={100}
        page={2}
        pageSize={20}
        onPaginationModelChange={onPaginationModelChange}
        loading={false}
        onMarkRead={vi.fn()}
        markReadLoading={false}
      />,
    );

    const grid = screen.getByTestId("mock-grid");
    expect(grid).toHaveAttribute("data-pagination-mode", "server");
    expect(grid).toHaveAttribute("data-row-count", "100");
    expect(grid).toHaveAttribute("data-page", "2");
    expect(screen.getByTestId("row-7")).toHaveTextContent("Node down");
    // Grid grows with the selected page size; the page is the only scroller.
    expect(container.querySelector(".data-grid-wrap")).toBeTruthy();
    expect(grid).toHaveAttribute("data-auto-height", "default");

    await user.click(screen.getByTestId("next-page"));
    expect(onPaginationModelChange).toHaveBeenCalledWith({ page: 3, pageSize: 20 });
  });
});
