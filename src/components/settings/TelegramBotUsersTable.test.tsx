import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";
import TelegramBotUsersTable from "./TelegramBotUsersTable";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../api/orval/telegram-bot-user/telegram-bot-user.ts", () => ({
  usePostApiTgbotUsersBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersUnblock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersSetAdmin: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersUnsetAdmin: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("TelegramBotUsersTable", () => {
  it("uses a fixed viewport and disables autoHeight", () => {
    const { container } = renderWithProviders(
      <TelegramBotUsersTable
        users={[]}
        refreshUsers={vi.fn()}
        loading={false}
        gridProps={{
          paginationMode: "server",
          rowCount: 0,
          paginationModel: { page: 0, pageSize: 10 },
          onPaginationModelChange: vi.fn(),
          pageSizeOptions: [10, 20],
        }}
      />,
    );

    expect(container.querySelector(".data-grid-wrap--viewport")).toBeTruthy();
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-auto-height", "false");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-grid-id", "telegram-bot-users");
  });
});
