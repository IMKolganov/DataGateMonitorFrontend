import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div data-testid="filter-bar" /> }));
vi.mock("../../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));
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

const tgUsers = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  telegramId: 1000 + i,
  username: `tg_user_${i}`,
  firstName: `User${i}`,
  isBlocked: false,
  isAdmin: false,
}));

vi.mock("../../api/orval/telegram-bot-users-v2/telegram-bot-users-v2", () => ({
  useGetApiV2TgbotUsers: (params?: { Page?: number; PageSize?: number }) => {
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 5;
    const start = (page - 1) * pageSize;
    return {
      data: {
        telegramBotUsers: {
          items: tgUsers.slice(start, start + pageSize),
          totalCount: tgUsers.length,
          page,
          pageSize,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: usersRefetch,
    };
  },
}));

vi.mock("../../api/orval/telegram-bot-user/telegram-bot-user", () => ({
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
            username: "tg_user_0",
            messageText: "hello bot",
            telegramId: 1000,
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
    expect(screen.getAllByTestId("grid-rows")[0]!.textContent).toContain("tg_user_0");
  });

  it("refreshes Telegram bot users via Orval", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TelegramBotSettings />);

    const refreshButtons = screen.getAllByRole("button", { name: /Refresh/i });
    await user.click(refreshButtons[0]!);
    expect(usersRefetch).toHaveBeenCalled();
  });

  it("paginates telegram users via v2 Page params", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TelegramBotSettings />);

    const userGrid = screen.getAllByTestId("mock-grid")[0]!;
    expect(userGrid).toHaveAttribute("data-pagination-mode", "server");
    await waitFor(() => {
      expect(userGrid).toHaveAttribute("data-row-count", "12");
    });
    expect(screen.getAllByTestId("grid-rows")[0]!.textContent).toContain("tg_user_0");

    const nextButtons = screen.getAllByTestId("next-page");
    await user.click(nextButtons[0]!);
    await waitFor(() => {
      expect(screen.getAllByTestId("grid-rows")[0]!.textContent).toContain("tg_user_5");
    });
    expect(screen.getAllByTestId("mock-grid")[0]).toHaveAttribute("data-page", "1");
  });
});
