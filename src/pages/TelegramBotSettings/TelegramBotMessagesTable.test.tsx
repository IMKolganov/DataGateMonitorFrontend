import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";
import { truncateOneLine } from "../../utils/notifications/notificationMessageFormat";
import TelegramBotMessagesTable, {
  TELEGRAM_MESSAGE_PREVIEW_LENGTH,
} from "./TelegramBotMessagesTable";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

describe("TelegramBotMessagesTable", () => {
  it("uses a fixed viewport and disables autoHeight (virtualization stays on)", () => {
    const { container } = renderWithProviders(
      <TelegramBotMessagesTable
        messages={[]}
        loading={false}
        page={0}
        pageSize={10}
        totalMessages={0}
        onPaginationModelChange={vi.fn()}
      />,
    );

    expect(container.querySelector(".data-grid-wrap--viewport")).toBeTruthy();
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-auto-height", "false");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-grid-id", "telegram-bot-messages");
  });

  it("truncates long message bodies so remounts cannot explode cell height", () => {
    const long = `${"word ".repeat(80)}\nsecond line with stack\n${"x".repeat(200)}`;
    renderWithProviders(
      <TelegramBotMessagesTable
        messages={[
          {
            id: 1,
            telegramId: 42,
            username: "alice",
            messageText: long,
            createDate: "2024-01-01T00:00:00Z",
          },
        ]}
        loading={false}
        page={0}
        pageSize={10}
        totalMessages={1}
        onPaginationModelChange={vi.fn()}
      />,
    );

    const preview = truncateOneLine(long, TELEGRAM_MESSAGE_PREVIEW_LENGTH);
    expect(screen.getByTestId("row-1")).toHaveAttribute("data-text", preview);
    expect(preview.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_PREVIEW_LENGTH);
    expect(preview.includes("\n")).toBe(false);
  });
});
