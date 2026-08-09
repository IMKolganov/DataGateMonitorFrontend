import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../ui/UserAvatar.tsx", () => ({
  UserAvatar: () => <span data-testid="avatar" />,
}));

import UsersTable from "./UsersTable";

describe("UsersTable pagination", () => {
  it("renders server page rows and forwards page changes", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    render(
      <MemoryRouter>
        <UsersTable
          users={[
            { id: 1, displayName: "Alice", email: "a@ex.com" },
            { id: 2, displayName: "Bob", email: "b@ex.com" },
          ]}
          totalCount={40}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={onPaginationModelChange}
          loading={false}
        />
      </MemoryRouter>,
    );

    const grid = screen.getByTestId("mock-grid");
    expect(grid).toHaveAttribute("data-pagination-mode", "server");
    expect(grid).toHaveAttribute("data-row-count", "40");
    expect(screen.getByTestId("row-1")).toHaveTextContent("Alice");
    expect(screen.getByTestId("row-2")).toHaveTextContent("Bob");

    await user.click(screen.getByTestId("next-page"));
    expect(onPaginationModelChange).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("forwards loading and page-size changes", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    render(
      <MemoryRouter>
        <UsersTable
          users={[]}
          totalCount={0}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={onPaginationModelChange}
          loading
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-loading", "true");
    await user.click(screen.getByTestId("set-page-size-20"));
    expect(onPaginationModelChange).toHaveBeenCalledWith({ page: 0, pageSize: 20 });
  });
});
