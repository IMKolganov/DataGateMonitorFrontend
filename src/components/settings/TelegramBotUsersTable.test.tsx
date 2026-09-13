import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../api/orval/telegram-bot-user/telegram-bot-user.ts", () => ({
  usePostApiTgbotUsersBlock: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersUnblock: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersSetAdmin: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersUnsetAdmin: () => ({ mutateAsync: vi.fn() }),
}));

import TelegramBotUsersTable from "./TelegramBotUsersTable";

describe("TelegramBotUsersTable server pagination", () => {
  it("renders all passed rows in server mode and forwards page changes", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    const pageItems = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      telegramId: 1000 + i,
      username: `u${i}`,
      firstName: `User${i}`,
      lastName: "",
    }));

    const gridProps = {
      paginationMode: "server" as const,
      paginationModel: { page: 0, pageSize: 5 },
      rowCount: 12,
      onPaginationModelChange: (model: GridPaginationModel) => onPaginationModelChange(model),
      pageSizeOptions: [5, 10, 20],
    };

    render(
      <TelegramBotUsersTable
        users={pageItems}
        refreshUsers={vi.fn()}
        loading={false}
        gridProps={gridProps}
      />,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("row-1")).toHaveTextContent("u0");
    expect(screen.getByTestId("row-5")).toHaveTextContent("u4");

    await user.click(screen.getByTestId("next-page"));
    expect(onPaginationModelChange).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
  });
});
