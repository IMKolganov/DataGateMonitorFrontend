import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div data-testid="filter-bar" /> }));
vi.mock("../../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(10));
vi.mock("../../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));

const usersRefetch = vi.fn().mockResolvedValue({});
const messagesRefetch = vi.fn().mockResolvedValue({});

vi.mock("../../api/orval/telegram-bot-user/telegram-bot-user", () => ({
  useGetApiTgbotUsersGetAll: () => ({
    data: {
      telegramBotUsers: [
        {
          id: 1,
          telegramId: 111,
          username: "tg_alice",
          firstName: "Alice",
          isBlocked: false,
          isAdmin: false,
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: usersRefetch,
  }),
  usePostApiTgbotUsersBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersUnblock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersSetAdmin: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiTgbotUsersUnsetAdmin: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log", () => ({
  useGetApiTgbotIncomingMessageLogsGetAll: () => ({
    data: {
      messages: {
        items: [
          {
            id: 9,
            username: "tg_alice",
            messageText: "hello bot",
            telegramId: 111,
          },
        ],
        totalCount: 1,
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: messagesRefetch,
  }),
}));

import { TelegramBotSettings } from "./TelegramBotSettings";

describe("TelegramBotSettings", () => {
  beforeEach(() => {
    usersRefetch.mockClear();
    messagesRefetch.mockClear();
  });

  it("renders heading and Orval users/messages grids", () => {
    renderWithProviders(<TelegramBotSettings />);

    expect(screen.getByRole("heading", { name: /Telegram Bot Settings/i })).toBeInTheDocument();
    const grids = screen.getAllByTestId("mock-grid");
    expect(grids.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/tg_alice/i).length).toBeGreaterThan(0);
  });

  it("refreshes Telegram bot users via Orval", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TelegramBotSettings />);

    const refreshButtons = screen.getAllByRole("button", { name: /Refresh/i });
    await user.click(refreshButtons[0]!);
    expect(usersRefetch).toHaveBeenCalled();
  });
});
