import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("../../api/orval/telegram-bot-user/telegram-bot-user.ts", () => ({
  usePostApiTgbotUsersBlock: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersUnblock: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersSetAdmin: () => ({ mutateAsync: vi.fn() }),
  usePostApiTgbotUsersUnsetAdmin: () => ({ mutateAsync: vi.fn() }),
}));

import TelegramBotUsersTable from "./TelegramBotUsersTable";

describe("TelegramBotUsersTable client pagination", () => {
  it("slices users across pages", async () => {
    const user = userEvent.setup();
    const users = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      telegramId: 1000 + i,
      username: `u${i}`,
      firstName: `User${i}`,
      lastName: "",
    }));

    render(
      <TelegramBotUsersTable users={users} refreshUsers={vi.fn()} loading={false} />,
    );

    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("row-1")).toHaveTextContent("u0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("row-6")).toHaveTextContent("u5");
  });
});
